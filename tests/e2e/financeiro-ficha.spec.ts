import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { createTestBudgetCategory, createTestExpense } from '../factories/finance'

/**
 * A ficha do gasto segue a VIDA dele: planejo, cotei, fechei, paguei, anexei.
 *
 * Detalhes — o nome, a categoria e a estimativa, que é o que o casal escreveu
 * primeiro e o que ele revisa mais — ficava por último, depois de quatro
 * painéis (rodada de usabilidade de 20/09/2026, ponto 19). E era o único bloco
 * do módulo com formulário e botão "Salvar alterações": a primeira coisa que a
 * tela pedia e a última que ela confirmava.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('a ficha abre por Detalhes, salva no lugar e guarda o excluir no cabeçalho', async ({
  page,
}) => {
  test.setTimeout(180_000)

  const categoria = await createTestBudgetCategory(conta.admin, conta.casamentoId, {
    nome: 'Decoração e flores',
  })
  const gasto = await createTestExpense(conta.admin, conta.casamentoId, {
    descricao: 'Arranjos da mesa',
    categoria_id: categoria.id,
    valor_estimado_centavos: 300000,
  })

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/financeiro/gastos/${gasto.id}`)
  await expect(page.getByRole('heading', { level: 1, name: gasto.descricao })).toBeVisible({
    timeout: 20_000,
  })

  // --- a ordem dos painéis é a da vida do gasto ---
  const titulos = await page.getByRole('heading', { level: 2 }).allInnerTexts()
  expect(titulos).toEqual(['Detalhes', 'Propostas', 'Contrato', 'Documentos'])

  // --- edição no lugar: sair do bloco salva, sem botão nenhum ---
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(0)

  const nome = page.getByLabel('Nome do gasto')
  await expect(async () => {
    await nome.fill('Arranjos da mesa e do altar')
    await page.getByRole('heading', { level: 1 }).first().click()
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 30_000 })

  const { data: salvo } = await conta.admin
    .from('despesas')
    .select('descricao')
    .eq('id', gasto.id)
    .single()
  expect(salvo?.descricao).toBe('Arranjos da mesa e do altar')

  // --- e o excluir mora no menu do cabeçalho ---
  await page.getByRole('button', { name: 'Ações do gasto' }).click()
  await expect(page.getByRole('menuitem', { name: 'Excluir gasto' })).toBeVisible()
})
