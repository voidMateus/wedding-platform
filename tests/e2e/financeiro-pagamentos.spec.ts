import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import {
  createTestBudgetCategory,
  createTestExpense,
  createTestInstallment,
} from '../factories/finance'

/**
 * Pagamentos abre com o fechamento: quanto já saiu, o que vence, o que ficou
 * sem data.
 *
 * A tela existia e organizava o dinheiro no eixo do tempo, mas a leitura
 * "quanto já paguei e quanto ainda vou pagar, e quando" não estava em lugar
 * nenhum de forma direta (rodada de usabilidade de 20/09/2026, ponto 20): ela
 * só se montava somando cabeçalhos de faixa com o olho.
 *
 * O índice NÃO é a régua de totais que saiu daqui: são os números das próprias
 * faixas logo abaixo, e cada um filtra a lista em vez de abrir outra tela.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()

  const categoria = await createTestBudgetCategory(conta.admin, conta.casamentoId, {
    nome: 'Buffet',
  })

  // Um gasto contratado com três parcelas: uma paga, uma vencida e uma futura —
  // é o conjunto mínimo em que o índice tem o que dizer.
  const gasto = await createTestExpense(conta.admin, conta.casamentoId, {
    descricao: 'Jantar',
    categoria_id: categoria.id,
    valor_estimado_centavos: 900000,
    valor_centavos: 900000,
  })

  await createTestInstallment(conta.admin, conta.casamentoId, gasto.id, {
    numero: 1,
    valor_centavos: 300000,
    vence_em: '2020-01-10',
    pago_em: '2020-01-10',
  })
  await createTestInstallment(conta.admin, conta.casamentoId, gasto.id, {
    numero: 2,
    valor_centavos: 300000,
    vence_em: '2020-02-10',
  })
  await createTestInstallment(conta.admin, conta.casamentoId, gasto.id, {
    numero: 3,
    valor_centavos: 300000,
    vence_em: '2099-02-10',
  })
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('o índice abre a tela e cada número filtra a lista', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })

  const pago = page.getByRole('button', { name: /^Pago R\$/ })
  const vencido = page.getByRole('button', { name: /^Vencido R\$/ })

  await expect(pago).toBeVisible({ timeout: 20_000 })
  await expect(vencido).toBeVisible()

  // A parcela paga e a vencida têm o mesmo valor: o que separa os dois números
  // é a situação, não o dinheiro.
  await expect(pago).toContainText('R$ 3.000,00')
  await expect(vencido).toContainText('R$ 3.000,00')

  // --- clicar filtra a lista, e não abre outra tela ---
  await expect(async () => {
    await vencido.click({ timeout: 3_000 })
    await expect(vencido).toHaveAttribute('aria-pressed', 'true', { timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  await expect(page).toHaveURL(/\/financeiro\/pagamentos$/)
  await expect(page.getByRole('button', { name: /^Vencidos/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mais para frente/ })).toHaveCount(0)

  // --- e clicar de novo devolve a tela inteira ---
  await vencido.click()
  await expect(vencido).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: /^Mais para frente/ })).toBeVisible()
})
