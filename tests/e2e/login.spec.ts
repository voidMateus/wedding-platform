import { expect, test } from '@playwright/test'

// Requer um usuário real já vinculado como wedding_member em wedding_members
// (CLAUDE.md, seção 14.2) — não há signup self-service nesta fase (seção
// 33.2), então esse usuário é provisionado manualmente contra o projeto
// Supabase configurado em .env. Sem essas variáveis, o teste é pulado — não
// falha um ambiente que ainda não tem um usuário de teste provisionado.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.skip(!email || !password, 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD não configurados')

test('casal faz login, acessa o painel e desloga', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
  // Espera a hidratação terminar antes de interagir — em dev, o client do
  // Supabase é importado sob demanda (dezenas de módulos ESM não
  // empacotados) e um clique disparado cedo demais não gera evento de
  // submit algum, porque os listeners do Vue ainda não foram anexados.
  await page.waitForLoadState('networkidle')

  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(password!)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL(/\/admin\/[^/]+$/, { timeout: 10_000 })
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
