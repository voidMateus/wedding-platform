import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'

/**
 * O funil de estágios na tela, e o caminho que o torna honesto: registrar a
 * resposta de quem não usou o site.
 *
 * A regra do funil está coberta por integração (`tests/integration/api`), que é
 * o que roda no CI. O que só o navegador prova é a fiação: que a coluna Status
 * mostra UM estágio em vez de empilhar badges, que o seletor da linha do membro
 * grava de verdade, e que o estágio do convite anda depois disso.
 *
 * O cenário é a avó de propósito: recebeu convite em papel, nunca abriu o site,
 * confirmou por telefone. Antes deste caminho existir, ela ficava eternamente
 * "Pendente" e o acompanhamento do casal só funcionava para convidado digital.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

const TEST_PASSWORD = 'teste-e2e-senha-fake-123!'

test('registrar a resposta pelo casal move o convite no funil', async ({ page }) => {
  test.setTimeout(120_000)
  const admin = getServiceRoleClient()

  const wedding = await createTestWedding(admin, { nomes_noivos: 'Teste E2E Status' })

  const email = `teste-e2e-status-${Date.now()}@example.com`
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    throw new Error(`Falha ao criar usuário de teste: ${userError?.message}`)
  }
  const userId = userData.user.id

  const { error: memberError } = await admin
    .from('membros_casamento')
    .insert({ casamento_id: wedding.id, usuario_id: userId, papel: 'dono' })
  if (memberError) {
    throw new Error(`Falha ao vincular membership de teste: ${memberError.message}`)
  }

  try {
    const { data: invite, error: inviteError } = await admin
      .from('convites')
      .insert({
        casamento_id: wedding.id,
        nome: 'Convite da Vovo',
        codigo_interno: `E2E-${Date.now().toString().slice(-8)}`,
      })
      .select('id')
      .single()
    if (inviteError || !invite) throw new Error(`Falha ao criar convite: ${inviteError?.message}`)

    const { error: guestError } = await admin.from('convidados').insert({
      casamento_id: wedding.id,
      convite_id: invite.id,
      nome_completo: 'Vovo Dalva',
    })
    if (guestError) throw new Error(`Falha ao criar convidada: ${guestError.message}`)

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/${wedding.slug}$`), { timeout: 20_000 })

    await page.goto(`/admin/${wedding.slug}/convites`)
    await expect(page.getByRole('heading', { level: 1, name: 'Convites' })).toBeVisible({
      timeout: 20_000,
    })

    // --- a coluna Status mostra UM estágio, com palavra própria ---
    //
    // "Não enviado" e "Enviado" eram a MESMA palavra ("Pendente"), distinguidas
    // só pelo tom do badge. O primeiro estágio agora se chama pelo que é.
    const linha = page.getByRole('row').filter({ hasText: 'Convite da Vovo' })
    await expect(linha).toContainText('Não enviado')
    await expect(linha).not.toContainText('Pendente')

    // --- registrar a resposta, sem a vovó tocar no site ---
    await expect(async () => {
      await page.getByRole('button', { name: 'Convite da Vovo', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 20_000 })

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toContainText('Não enviado')
    // A providência aparece ao lado do estágio — é o que justifica o funil.
    await expect(dialogo).toContainText('Enviar convite')

    const resposta = dialogo.getByRole('combobox', { name: 'Resposta de Vovo Dalva' })
    await expect(resposta).toBeVisible()
    await resposta.click()
    // "Estará lá", não "Confirmado": o rótulo de cada status de RSVP vem do
    // catálogo central de campos (`campos-convidado`), escrito na fala do
    // convidado — e é o mesmo texto que o painel já exibia nos badges.
    await page.getByRole('option', { name: 'Estará lá' }).click()

    // O convite fecha o funil sem nunca ter passado por "Aberto": não existe
    // jornada digital obrigatória.
    await expect(dialogo).toContainText('Respondido', { timeout: 20_000 })
    await expect(dialogo).toContainText('1 de 1 responderam')

    // E o sistema não inventa um acesso que não houve.
    const { count } = await admin
      .from('historico_convite')
      .select('*', { count: 'exact', head: true })
      .eq('convite_id', invite.id)
      .eq('tipo_evento', 'rsvp.first_access')
    expect(count).toBe(0)

    // --- a listagem por trás acompanha ---
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 })
    await expect(linha).toContainText('Respondido', { timeout: 20_000 })
  } finally {
    await admin.auth.admin.deleteUser(userId)
    await deleteTestWedding(admin, wedding.id)
  }
})
