import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'

// Auto-suficiente (docs/PLANO-SAAS.md, Passo 3) — ao contrário de
// login.spec.ts/guests-invites-rsvp.spec.ts, não depende de um usuário
// wedding_member pré-provisionado manualmente (E2E_ADMIN_EMAIL/PASSWORD):
// cria seu próprio usuário com duas memberships reais, exatamente o cenário
// que a tela de seleção existe para cobrir, e limpa tudo ao final. Só exige
// as credenciais de Supabase já necessárias para o próprio `npm run dev`
// funcionar (importar o helper de integração já carrega `.env` via
// `dotenv/config`, ver tests/integration/helpers/supabase-clients.ts).
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

const TEST_PASSWORD = 'teste-e2e-senha-fake-123!'

test('conta com mais de um casamento vê tela de seleção e troca de casamento ativo', async ({ page }) => {
  test.setTimeout(60_000)
  const admin = getServiceRoleClient()

  const weddingA = await createTestWedding(admin, { nomes_noivos: 'Teste E2E Casamento A' })
  const weddingB = await createTestWedding(admin, { nomes_noivos: 'Teste E2E Casamento B' })

  const email = `teste-e2e-selecao-${Date.now()}@example.com`
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    throw new Error(`Falha ao criar usuário de teste: ${userError?.message}`)
  }
  const userId = userData.user.id

  const { error: memberError } = await admin.from('membros_casamento').insert([
    { casamento_id: weddingA.id, usuario_id: userId, papel: 'dono' },
    { casamento_id: weddingB.id, usuario_id: userId, papel: 'colaborador' },
  ])
  if (memberError) {
    throw new Error(`Falha ao vincular memberships de teste: ${memberError.message}`)
  }

  try {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    // Duas memberships: o middleware não redireciona sozinho, fica em /admin
    // renderizando a tela de seleção (comportamento de membership única já
    // coberto por login.spec.ts).
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Selecione um casamento' })).toBeVisible()
    await expect(page.getByText('Teste E2E Casamento A')).toBeVisible()
    await expect(page.getByText('Teste E2E Casamento B')).toBeVisible()

    // --- seleciona o casamento A ---
    await page.getByText('Teste E2E Casamento A').click()
    await expect(page).toHaveURL(new RegExp(`/admin/${weddingA.slug}$`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // --- volta pra seleção e troca para o casamento B ---
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Selecione um casamento' })).toBeVisible()
    await page.getByText('Teste E2E Casamento B').click()
    await expect(page).toHaveURL(new RegExp(`/admin/${weddingB.slug}$`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // --- acessar direto a URL do casamento A depois de já ter trocado funciona ---
    await page.goto(`/admin/${weddingA.slug}`)
    await expect(page).toHaveURL(new RegExp(`/admin/${weddingA.slug}$`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  } finally {
    await deleteTestWedding(admin, weddingA.id)
    await deleteTestWedding(admin, weddingB.id)
    await admin.auth.admin.deleteUser(userId)
  }
})
