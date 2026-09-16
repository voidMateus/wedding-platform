import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'
import { createTestGuest } from '../factories/guest'

/**
 * A equipe interna entra no painel do casal pelo /plataforma
 * (docs/fase5-multievento.md 6.7).
 *
 * Este spec existe por um defeito real, encontrado no primeiro uso: clicar em
 * "Entrar para dar suporte" criava o vínculo no banco, registrava na trilha —
 * e devolvia o operador para /plataforma. O middleware barrava por
 * `authStore.memberships`, que é um cache populado no login, e o conjunto real
 * tinha acabado de mudar no servidor.
 *
 * Por isso o teste não para em "abriu o painel": ele confere que o painel é
 * MESMO o do casamento certo, e que encerrar o acesso fecha a porta.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

const TEST_PASSWORD = 'teste-e2e-senha-fake-123!'

test('operador entra no painel do casal pelo /plataforma e encerra o acesso', async ({ page }) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  const casamento = await createTestWedding(admin, {
    nomes_noivos: 'Suporte Ana & Bruno',
    status_ciclo_vida: 'rascunho',
  })
  await createTestGuest(admin, casamento.id, { nome_completo: 'Convidado Do Suporte' })

  const email = `teste-e2e-suporte-${Date.now()}@example.com`
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    throw new Error(`Falha ao criar operador de teste: ${userError?.message}`)
  }
  const operadorId = userData.user.id

  const { error: opError } = await admin
    .from('operadores_plataforma')
    .insert({ usuario_id: operadorId })
  if (opError) {
    throw new Error(`Falha ao vincular operador de teste: ${opError.message}`)
  }

  try {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    // Conta sem casamento nenhum, mas operadora: o middleware leva ao painel
    // interno em vez do estado vazio de /admin.
    await expect(page).toHaveURL(/\/plataforma$/, { timeout: 20_000 })

    await page.goto(`/plataforma/${casamento.id}`)
    await expect(page.getByRole('heading', { name: 'Suporte Ana & Bruno' })).toBeVisible({
      timeout: 20_000,
    })

    // --- o clique que estava quebrado ---
    await expect(async () => {
      await page.getByRole('button', { name: /Entrar para dar suporte/ }).click()
      await expect(page).toHaveURL(new RegExp(`/admin/${casamento.slug}`), { timeout: 5_000 })
    }).toPass({ timeout: 30_000 })

    // Não basta ter saído do /plataforma: o painel precisa ser o do casamento
    // certo, com o dado dele dentro.
    await expect(page.locator('header').first()).toContainText('Suporte Ana & Bruno')
    await page.goto(`/admin/${casamento.slug}/convidados`)
    await expect(
      page.getByRole('button', { name: 'Convidado Do Suporte', exact: true }),
    ).toBeVisible({ timeout: 20_000 })

    // --- com acesso aberto, a casa do operador continua sendo /plataforma ---
    //
    // Defeito real do primeiro uso: o vínculo de suporte contava como
    // membership, então o login do operador passou a cair em "Seus casamentos"
    // listando quatro eventos de clientes como se fossem dele. Acesso a um
    // casamento de cliente não é posse (docs/fase5-multievento.md 6.7).
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/plataforma$/, { timeout: 20_000 })
    // E chega no painel INTERNO, não na lista de eventos da conta. Ali o
    // casamento do cliente aparece de propósito — a listagem do /plataforma é
    // deliberadamente entre tenants; o que não pode é ele constar como "seu".
    await expect(page.getByRole('heading', { name: 'Casamentos', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Seus casamentos' })).toBeHidden()

    // --- encerrar fecha a porta ---
    await page.goto(`/plataforma/${casamento.id}`)

    // Mesma razão do `toPass` da entrada: a ficha é renderizada no servidor e
    // o botão aparece antes de o Vue hidratar; um clique nessa janela move o
    // foco sem acionar handler nenhum. O efeito observável é o próprio botão
    // sumir — `suporteAtivo` vira falso.
    const encerrar = page.getByRole('button', { name: 'Encerrar acesso' })
    await expect(async () => {
      await encerrar.click()
      await expect(encerrar).toBeHidden({ timeout: 3_000 })
    }).toPass({ timeout: 30_000 })

    await page.goto(`/admin/${casamento.slug}`)
    await expect(page).toHaveURL(/\/plataforma$/, { timeout: 20_000 })
  } finally {
    await deleteTestWedding(admin, casamento.id)
    await admin.from('operadores_plataforma').delete().eq('usuario_id', operadorId)
    await admin.auth.admin.deleteUser(operadorId)
  }
})
