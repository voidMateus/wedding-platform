import { expect, test } from '@playwright/test'

// Requer um usuário real já vinculado como wedding_member (mesma condição
// de login.spec.ts) — valida o fluxo ponta a ponta da reestruturação de
// Convidados/Acompanhantes/Convites/RSVP (CLAUDE.md, seção 12.1) contra o
// Supabase de desenvolvimento real.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.skip(!email || !password, 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD não configurados')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(password!)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 })
}

test('cadastro de convidado com acompanhante cria convite, e RSVP por busca funciona ponta a ponta', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const suffix = Date.now().toString().slice(-8)
  const primaryName = `Zeteste${suffix} Principal`
  const companionName = `Zeteste${suffix} Acompanhante`

  await login(page)

  // --- wizard: cadastro com acompanhante + criação automática de convite ---
  await page.goto('/admin/convidados/novo')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Nome completo').fill(primaryName)
  await page.getByRole('button', { name: 'Próximo' }).click()

  await page.getByRole('button', { name: '+ Adicionar acompanhante' }).click()
  await page.getByLabel('Nome completo').fill(companionName)
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText(companionName)).toBeVisible()
  await page.getByRole('button', { name: 'Próximo' }).click()

  // Passo Convite — sugestão automática, aceita criar
  await expect(page.getByText(/Este grupo possui 2 pessoas/)).toBeVisible()
  await page.getByRole('button', { name: 'Próximo' }).click()

  // Revisão
  await expect(page.getByText(primaryName)).toBeVisible()
  await expect(page.getByText(companionName)).toBeVisible()
  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(page).toHaveURL(/\/admin\/convidados$/, { timeout: 10_000 })

  // --- convite criado automaticamente, com responsável destacado ---
  await page.goto('/admin/convites')
  await page.getByPlaceholder('Buscar por nome do convite').fill(`Família ${primaryName.split(' ')[0]}`)
  const inviteLink = page.getByRole('link', { name: new RegExp(`Família ${primaryName.split(' ')[0]}`) })
  await expect(inviteLink).toBeVisible({ timeout: 10_000 })
  await inviteLink.click()
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(primaryName)).toBeVisible()
  await expect(page.getByText('(Responsável)')).toBeVisible()

  // --- gera link de acesso e extrai o código ---
  await page.getByRole('button', { name: 'Link de acesso' }).click()
  await page.getByRole('button', { name: 'Gerar link' }).click()
  const linkInput = page.locator('input[disabled]')
  await expect(linkInput).toBeVisible({ timeout: 10_000 })
  const link = await linkInput.inputValue()
  const code = link.split('/rsvp/')[1]
  expect(code).toBeTruthy()

  // --- RSVP público via atalho de link direto ---
  await page.goto(`/rsvp/${code}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(primaryName)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(companionName)).toBeVisible()

  const guestCards = page.locator('div.rounded-lg.border')
  await guestCards.nth(0).getByRole('button', { name: 'Estarei lá' }).click()
  await guestCards.nth(1).getByRole('button', { name: 'Não poderei ir' }).click()

  await page.getByRole('button', { name: 'Revisar e enviar' }).click()
  await page.getByRole('button', { name: 'Confirmar presença' }).click()
  await expect(page.getByText('Presença confirmada!')).toBeVisible({ timeout: 10_000 })

  // --- busca pública por nome também encontra o mesmo convidado ---
  await page.goto('/rsvp')
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder('Digite seu nome').fill(primaryName)
  await expect(page.getByRole('button', { name: primaryName })).toBeVisible({ timeout: 10_000 })
})
