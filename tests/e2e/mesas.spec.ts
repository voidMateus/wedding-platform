import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { expectNoAccessibilityViolations } from './utils/a11y'

/**
 * Mesas, ponta a ponta — e o foco é a PLANTA.
 *
 * A lista e os agregados já estão cobertos por testes de integração, que são
 * mais rápidos e mais precisos. O que só o navegador exercita é o arrasto: o
 * ponteiro, a conversão de pixel para centímetro, o salvamento ao soltar e o
 * clique que fecha o gesto sem abrir o painel por cima.
 *
 * Cria o próprio usuário e o próprio casamento (só precisa de
 * `SUPABASE_SERVICE_ROLE_KEY`), no mesmo molde de `modo-lista.spec.ts`.
 */
// `getServiceRoleClient` traz o `dotenv/config` junto — sem ele, o `.env` não
// chega ao processo do Playwright e a suíte inteira pularia em silêncio.
const TEST_PASSWORD = 'teste-e2e-senha-fake-123!'

test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

test('a planta posiciona a mesa por arrasto, e o lugar novo sobrevive ao recarregar', async ({
  page,
}) => {
  test.setTimeout(120_000)

  const admin = getServiceRoleClient()

  const sufixo = Date.now().toString(36)
  const email = `e2e-mesas-${sufixo}@wedding-platform.test`

  const { data: wedding, error: weddingError } = await admin
    .from('casamentos')
    .insert({
      slug: `e2e-mesas-${sufixo}`,
      nomes_noivos: 'Mesas E2E',
      data_evento: '2027-12-11',
    })
    .select()
    .single()
  if (weddingError || !wedding)
    throw new Error(`Falha ao criar casamento: ${weddingError?.message}`)

  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (userError || !user.user) throw new Error(`Falha ao criar usuário: ${userError?.message}`)
  const userId = user.user.id

  try {
    const { error: memberError } = await admin.from('membros_casamento').insert({
      casamento_id: wedding.id,
      usuario_id: userId,
      papel: 'dono',
    })
    if (memberError) throw new Error(`Falha ao vincular membro: ${memberError.message}`)

    await admin.from('convidados').insert([
      { casamento_id: wedding.id, nome_completo: 'Ana Primeira' },
      { casamento_id: wedding.id, nome_completo: 'Bruno Segundo' },
    ])

    // --- login ---
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/${wedding.slug}$`), { timeout: 20_000 })

    await page.goto(`/admin/${wedding.slug}/mesas`)
    await expect(page.getByRole('heading', { level: 1, name: 'Mesas' })).toBeVisible({
      timeout: 20_000,
    })

    // A ausência é informação: o casal vê quantas pessoas ainda precisam de
    // lugar antes de existir qualquer mesa.
    await expect(page.getByText('Falta acomodar')).toBeVisible()

    // --- cria a mesa ---
    //
    // `toPass` na primeira interação: a página é renderizada no servidor, e um
    // clique antes de o Vue hidratar não encontra listener e se perde.
    await expect(async () => {
      await page.getByRole('button', { name: 'Adicionar mesa' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })

    // Diálogo aberto — o único estado em que o formulário de mesa existe.
    await expectNoAccessibilityViolations(page, { rotulo: 'Mesas — diálogo de nova mesa' })

    await page.getByLabel('Nome ou número').fill('Mesa 1')
    await page.getByLabel('Lugares').fill('8')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })

    // --- senta alguém pela lista ---
    await page
      .getByRole('button', { name: /^Mesa 1/ })
      .first()
      .click()
    await page.getByRole('button', { name: 'Ana Primeira' }).first().click()
    await expect(page.getByText('1 de 8 lugares')).toBeVisible({ timeout: 15_000 })

    // --- a planta ---
    await page.goto(`/admin/${wedding.slug}/mesas?vista=planta`)
    const mesa = page.getByRole('button', { name: /^Mesa 1: 1 de 8 lugares/ })
    await expect(mesa).toBeVisible({ timeout: 20_000 })

    // A planta desenhada, com uma mesa ocupada e a fila de quem falta
    // acomodar: é o estado em que a tela tem conteúdo em vez de estado vazio.
    await expectNoAccessibilityViolations(page, { rotulo: 'Mesas — planta com mesa posicionada' })

    const antes = await mesa.boundingBox()
    if (!antes) throw new Error('mesa sem caixa na planta')

    await page.mouse.move(antes.x + antes.width / 2, antes.y + antes.height / 2)
    await page.mouse.down()
    await page.mouse.move(antes.x + 250, antes.y + 150, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(1_500)

    // Soltar a mesa NÃO pode abrir o painel dela: um arrasto termina em `click`
    // também, e sem a marca de "moveu" a planta trocaria de vista a cada
    // posicionamento.
    await expect(page).toHaveURL(/vista=planta/)

    // Recarregar é o que separa "mudou na tela" de "o servidor gravou".
    await page.reload()
    const depois = await page.getByRole('button', { name: /^Mesa 1: 1 de 8/ }).boundingBox()
    if (!depois) throw new Error('mesa sumiu depois de recarregar')

    expect(Math.round(depois.x - antes.x)).toBeGreaterThan(150)
    expect(Math.round(depois.y - antes.y)).toBeGreaterThan(80)
  } finally {
    await admin.from('casamentos').delete().eq('id', wedding.id)
    await admin.auth.admin.deleteUser(userId)
  }
})
