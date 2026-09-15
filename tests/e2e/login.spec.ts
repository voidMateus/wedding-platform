import { expect, test } from '@playwright/test'
import { criarContaDeTeste, type ContaDeTeste } from './support/conta-de-teste'

// Auto-suficiente: cria o próprio casal com `service_role` (ver
// tests/e2e/support/conta-de-teste.ts) em vez de depender de
// E2E_ADMIN_EMAIL/PASSWORD — duas variáveis que nunca estiveram no `.env` e
// faziam este arquivo inteiro ser PULADO em silêncio, deixando o login sem
// cobertura nenhuma numa suíte que terminava verde.
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

test('casal faz login, acessa o painel e desloga', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
  // Espera a hidratação terminar antes de interagir — em dev, o client do
  // Supabase é importado sob demanda (dezenas de módulos ESM não
  // empacotados) e um clique disparado cedo demais não gera evento de
  // submit algum, porque os listeners do Vue ainda não foram anexados.
  await page.waitForLoadState('networkidle')

  await page.getByLabel('E-mail').fill(conta.email)
  await page.getByLabel('Senha').fill(conta.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/admin\/[^/]+$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
})

test('colaborador sem sessão é redirecionado de /admin para /login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login\?redirect=\/admin/)
})
