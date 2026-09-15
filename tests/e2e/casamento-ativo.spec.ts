import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'
import { createTestGuest } from '../factories/guest'
import { expectNoAccessibilityViolations } from './utils/a11y'

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

test('conta com mais de um casamento vê tela de seleção e troca de casamento ativo', async ({
  page,
}) => {
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
    await expect(page.getByRole('heading', { name: 'Seus casamentos' })).toBeVisible()
    await expect(page.getByText('Teste E2E Casamento A')).toBeVisible()
    await expect(page.getByText('Teste E2E Casamento B')).toBeVisible()

    // A tela de seleção — fora do layout do painel, e a única que uma conta com
    // mais de uma membership vê antes de qualquer outra coisa.
    await expectNoAccessibilityViolations(page, { rotulo: 'Seleção de casamento' })

    // --- seleciona o casamento A ---
    await page.getByText('Teste E2E Casamento A').click()
    await expect(page).toHaveURL(new RegExp(`/admin/${weddingA.slug}$`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // --- volta pra seleção e troca para o casamento B ---
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Seus casamentos' })).toBeVisible()
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

/**
 * Nada do painel atravessa a troca de casamento
 * (docs/fase5-multievento.md 12.1).
 *
 * O teste fraco seria "o nome do cabeçalho mudou": ele passa enquanto o
 * dashboard, a lista de convidados e o tema continuam sendo os do casamento
 * anterior. O defeito é perigoso justamente por ser silencioso — não dá erro,
 * mostra o dado certo na tela errada —, então cada asserção abaixo cobre uma
 * ORIGEM diferente de estado: o layout, o store de auth, o `useFetch` de
 * página e o store de UI.
 *
 * A troca acontece pelo cabeçalho, nunca por `page.goto`: navegação de
 * documento recria tudo e esconderia exatamente o que se quer verificar — o
 * layout do painel NÃO desmonta ao ir de `/admin/a/**` para `/admin/b/**`.
 */
test('trocar de casamento pelo cabeçalho não deixa dado do anterior na tela', async ({ page }) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  const weddingA = await createTestWedding(admin, {
    nomes_noivos: 'Vazamento Ana & Bruno',
    data_evento: '2030-03-03',
  })
  const weddingB = await createTestWedding(admin, {
    nomes_noivos: 'Vazamento Carla & Diego',
    data_evento: '2031-07-07',
  })

  const email = `teste-e2e-vazamento-${Date.now()}@example.com`
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    throw new Error(`Falha ao criar usuário de teste: ${userError?.message}`)
  }
  const userId = userData.user.id

  // Papéis DIFERENTES de propósito: o papel exibido vinha de um `ref` do store
  // que só era populado no login, então quem é dono de um e colaborador de
  // outro seguia "Dono" nos dois depois da troca.
  const { error: memberError } = await admin.from('membros_casamento').insert([
    { casamento_id: weddingA.id, usuario_id: userId, papel: 'dono' },
    { casamento_id: weddingB.id, usuario_id: userId, papel: 'colaborador' },
  ])
  if (memberError) {
    throw new Error(`Falha ao vincular memberships de teste: ${memberError.message}`)
  }

  // Um convidado só no A: a lista de convidados é a origem "useFetch de
  // página", e vazia nos dois lados o teste não distinguiria nada.
  await createTestGuest(admin, weddingA.id, { nome_completo: 'Convidado Exclusivo Do A' })

  const cabecalho = page.locator('header').first()
  const linhaDoConvidado = page.getByRole('button', {
    name: 'Convidado Exclusivo Do A',
    exact: true,
  })

  async function esperarPainelDe(slug: string) {
    await expect(page).toHaveURL(new RegExp(`/admin/${slug}(/|$)`), { timeout: 15_000 })
  }

  /**
   * A troca acontece pelo cabeçalho — nunca por `page.goto`, que recriaria a
   * página e esconderia exatamente o que se quer verificar.
   *
   * O `toPass` envolve abrir E confirmar que abriu: a lista do painel é
   * renderizada no servidor, então ela fica visível alguns instantes antes de
   * o Vue hidratar, e um clique nessa janela move o foco sem acionar handler
   * nenhum. Repetir a abertura é mais honesto que um `waitForTimeout` fixo,
   * que seria um palpite sobre o tempo de hidratação da máquina que roda o
   * teste.
   */
  async function trocarPara(nomesNoivos: string) {
    const gatilho = cabecalho.getByRole('button', { name: /Trocar de evento/ })
    const menu = page.getByRole('menu')

    await expect(async () => {
      await gatilho.click()
      await expect(menu).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })

    await menu.getByRole('menuitem', { name: new RegExp(nomesNoivos) }).click()
  }

  try {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
    await page.getByText('Vazamento Ana & Bruno').click()
    await esperarPainelDe(weddingA.slug)

    // --- estado de partida: tudo do A ---
    await expect(cabecalho).toContainText('Vazamento Ana & Bruno')
    await expect(cabecalho).toContainText('Dono')

    await page.goto(`/admin/${weddingA.slug}/convidados`)
    await expect(linhaDoConvidado).toBeVisible({ timeout: 15_000 })

    // --- A → B, pelo cabeçalho (navegação de client, sem recarregar) ---
    await trocarPara('Vazamento Carla & Diego')
    await esperarPainelDe(weddingB.slug)

    // 1. layout: nome e data do casamento
    await expect(cabecalho).toContainText('Vazamento Carla & Diego')
    await expect(cabecalho).not.toContainText('Vazamento Ana & Bruno')

    // 2. store de auth: o papel é outro neste casamento
    await expect(cabecalho).toContainText('Colaborador')
    await expect(cabecalho).not.toContainText('Dono')

    // 3. useFetch de página: a lista de convidados do B está vazia
    await page.goto(`/admin/${weddingB.slug}/convidados`)
    await expect(page.getByText('Nenhum convidado', { exact: false })).toBeVisible({
      timeout: 15_000,
    })
    await expect(linhaDoConvidado).toHaveCount(0)

    // --- e de volta: meia correção (invalidar só na ida) passaria sem isto ---
    await trocarPara('Vazamento Ana & Bruno')
    await esperarPainelDe(weddingA.slug)

    await expect(cabecalho).toContainText('Vazamento Ana & Bruno')
    await expect(cabecalho).toContainText('Dono')
    await page.goto(`/admin/${weddingA.slug}/convidados`)
    await expect(linhaDoConvidado).toBeVisible({ timeout: 15_000 })
  } finally {
    await deleteTestWedding(admin, weddingA.id)
    await deleteTestWedding(admin, weddingB.id)
    await admin.auth.admin.deleteUser(userId)
  }
})
