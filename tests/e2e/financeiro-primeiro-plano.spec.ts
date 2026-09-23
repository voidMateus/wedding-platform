import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'

/**
 * O primeiro dia no Financeiro: do estado vazio ao primeiro gasto escrito.
 *
 * "Começar com as categorias sugeridas" criava as categorias e ficava em
 * Gastos — o estado vazio sumia (agora existem categorias) e a lista continuava
 * vazia. O casal clicava em "começar" e recebia a mesma tela, com zeros (rodada
 * de usabilidade de 20/09/2026, ponto 10). Não havia nada errado no dado; o
 * erro era o destino.
 *
 * Conta própria, sem `semearFinanceiro`: o que este teste descreve é
 * justamente o casamento que ainda não tem nada.
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

test('semear as sugeridas leva ao planejamento, já pronto para digitar', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/financeiro`)

  const comecar = page.getByRole('button', { name: /Começar com as categorias sugeridas/i })
  await expect(comecar).toBeVisible({ timeout: 20_000 })

  // `toPass` pela corrida de hidratação de sempre: a página vem do servidor e o
  // botão existe antes de o Vue anexar o handler.
  await expect(async () => {
    await comecar.click({ timeout: 3_000 })
    await expect(page).toHaveURL(/\/financeiro\/categorias$/, { timeout: 5_000 })
  }).toPass({ timeout: 30_000 })

  // --- chegou onde o trabalho continua, e a tela diz o que fazer ---
  await expect(page.getByText('É aqui que vocês planejam.')).toBeVisible({ timeout: 20_000 })

  // --- e o casal cai no GESTO: a primeira categoria abre com a linha esperando ---
  const campoNovo = page.getByLabel('Nome do gasto novo')
  await expect(campoNovo).toBeVisible({ timeout: 20_000 })

  await campoNovo.fill('Buffet do casamento')
  await page.getByLabel('Estimativa do gasto novo').fill('30.000,00')
  await page.getByRole('heading', { level: 1, name: 'Onde o dinheiro está indo' }).click()

  await expect(page.getByLabel('Estimativa de Buffet do casamento')).toHaveValue('30.000,00', {
    timeout: 20_000,
  })

  // --- o acolhimento some quando deixa de ser o primeiro dia ---
  await expect(page.getByText('É aqui que vocês planejam.')).toBeHidden({ timeout: 20_000 })
})
