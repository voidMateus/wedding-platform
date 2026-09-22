import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { createTestBudgetCategory, createTestExpense } from '../factories/finance'

/**
 * Todo contrato tem um fornecedor — e ele nasce no próprio ato quando não veio
 * de uma proposta.
 *
 * `useFinance.registrarContratacao` gravava só o valor e as parcelas quando não
 * havia `fornecedorId`: **nenhum fornecedor era criado ou vinculado**, e a
 * modal nem perguntava o nome. O casal que fecha com o buffet sem ter
 * cadastrado cotação ficava com um gasto contratado e sem contraparte — sem a
 * quem pendurar documento, sem telefone para a cerimonialista (rodada de
 * usabilidade de 20/09/2026, ponto 17).
 *
 * A falha era muda: a contratação dava certo, o dinheiro aparecia em
 * Pagamentos, e o que faltava só se descobria meses depois, procurando o
 * telefone de alguém.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

// O segundo teste lê o fornecedor que o primeiro cria, na mesma conta: com
// `fullyParallel: true` no config eles correriam junto, e a lista chegaria
// vazia. Serial aqui descreve a dependência, não a esconde.
test.describe.configure({ mode: 'serial' })

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('contratar sem proposta cria o fornecedor e o vincula ao gasto', async ({ page }) => {
  test.setTimeout(180_000)

  const categoria = await createTestBudgetCategory(conta.admin, conta.casamentoId, {
    nome: 'Buffet',
  })
  const gasto = await createTestExpense(conta.admin, conta.casamentoId, {
    descricao: 'Jantar dos convidados',
    categoria_id: categoria.id,
    valor_estimado_centavos: 2_000_000,
  })
  const fornecedor = `Buffet Recanto ${Date.now().toString().slice(-6)}`

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Gastos' })).toBeVisible({
    timeout: 20_000,
  })

  const linha = page.getByRole('row').filter({ hasText: gasto.descricao }).first()
  await expect(linha).toBeVisible({ timeout: 20_000 })

  await expect(async () => {
    await linha.getByRole('button', { name: /^Ações de/ }).click({ timeout: 3_000 })
    await page.getByRole('menuitem', { name: 'Registrar valor fechado' }).click({ timeout: 3_000 })
    await expect(page.getByLabel('Valor fechado')).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  // --- sem "com quem", não fecha ---
  await page.getByLabel('Valor fechado').fill('18.000,00')
  await page.getByRole('button', { name: 'Confirmar contratação' }).click()
  await expect(page.getByText('Informe com quem vocês fecharam.')).toBeVisible()

  // --- com o nome, o fornecedor nasce junto ---
  await page.getByLabel('Com quem vocês fecharam?').fill(fornecedor)
  await page.getByRole('button', { name: 'Confirmar contratação' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar contratação' })).toBeHidden({
    timeout: 20_000,
  })

  // O vínculo nos DOIS sentidos é o que o CLAUDE.md exige — e é ele que faz o
  // fornecedor aparecer na ficha do gasto, e não só o valor.
  const { data: criado } = await conta.admin
    .from('fornecedores')
    .select('id, nome, despesa_id, estagio')
    .eq('casamento_id', conta.casamentoId)
    .eq('nome', fornecedor)
    .maybeSingle()

  expect(criado, 'o fornecedor precisa ter nascido junto da contratação').not.toBeNull()
  expect(criado?.despesa_id).toBe(gasto.id)
  expect(criado?.estagio).toBe('contratado')

  const { data: despesa } = await conta.admin
    .from('despesas')
    .select('fornecedor_id, valor_centavos')
    .eq('id', gasto.id)
    .single()

  expect(despesa?.fornecedor_id).toBe(criado?.id)
  expect(despesa?.valor_centavos).toBe(1_800_000)
})

/**
 * A lista de fornecedores existe para ser LEVADA — e não para cadastrar.
 *
 * Fornecedor só existia dentro da ficha do gasto, decisão deliberada e certa
 * para o cadastro (nenhuma cotação órfã). O caso que ela não previu é o da
 * cerimonialista no dia do evento: quem é o buffet, quem é o DJ, o telefone de
 * cada um (rodada de usabilidade de 20/09/2026, ponto 18).
 *
 * O teste guarda as duas metades: a lista mostra, e não deixa criar.
 */
test('a lista de fornecedores mostra quem atende o casamento, e não cadastra', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/financeiro/fornecedores`)

  await expect(page.getByRole('heading', { level: 1, name: 'Fornecedores' })).toBeVisible({
    timeout: 20_000,
  })

  // O fornecedor criado pelo teste anterior, na contratação sem proposta.
  await expect(page.getByRole('cell', { name: /Buffet Recanto/ })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('cell', { name: 'Jantar dos convidados' })).toBeVisible()

  // Nada de criar aqui: é o que mantém a garantia de que nenhuma cotação exista
  // sem um gasto para disputar.
  await expect(
    page.getByRole('button', { name: /Adicionar fornecedor|Novo fornecedor/ }),
  ).toHaveCount(0)

  // E os dois caminhos de levar a lista para fora.
  await expect(page.getByRole('button', { name: 'Imprimir lista' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Exportar' })).toBeEnabled()
})
