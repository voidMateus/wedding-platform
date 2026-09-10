import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'

/**
 * Agrupar como Acompanhantes, a partir da seleção do Modo Lista.
 *
 * Por que E2E e não só integração: o que decide se a operação é usável não é
 * a função no Postgres (essa está coberta em tests/integration/api/guests.spec.ts,
 * que é o que roda no CI), é o aviso ANTES de confirmar. Agrupar faz duas
 * coisas que a seleção não diz — traz o núcleo inteiro de quem já tinha um, e
 * coloca no convite de quem já tinha —, e as duas mexem em dado que o casal já
 * compartilhou com convidado. Um aviso que não bata com o que acontece é pior
 * que aviso nenhum, e só a tela real mostra isso.
 *
 * Auto-suficiente, no molde de modo-lista.spec.ts: cria o próprio casamento e
 * o próprio usuário, e limpa tudo ao final.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

const TEST_PASSWORD = 'teste-e2e-senha-fake-123!'

test('agrupar como acompanhantes: avisa o que a seleção não diz e junta num núcleo só', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const admin = getServiceRoleClient()

  const wedding = await createTestWedding(admin, { nomes_noivos: 'Teste E2E Acompanhantes' })

  const email = `teste-e2e-acompanhantes-${Date.now()}@example.com`
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
    // Joao e Maria já são um núcleo; Ana e Bruno estão soltos.
    const { data: nucleo } = await admin
      .from('nucleos_acompanhantes')
      .insert({ casamento_id: wedding.id })
      .select('id')
      .single()
    if (!nucleo) throw new Error('Falha ao criar núcleo de teste.')

    const pessoas = [
      { nome_completo: 'Joao Par', nucleo_id: nucleo.id, ordem_nucleo: 0 },
      { nome_completo: 'Maria Par', nucleo_id: nucleo.id, ordem_nucleo: 1 },
      { nome_completo: 'Ana Solta' },
      { nome_completo: 'Bruno Solto' },
    ]
    for (const pessoa of pessoas) {
      const { error } = await admin
        .from('convidados')
        .insert({ casamento_id: wedding.id, ...pessoa })
      if (error) throw new Error(`Falha ao inserir ${pessoa.nome_completo}: ${error.message}`)
    }

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/${wedding.slug}$`), { timeout: 20_000 })

    await page.goto(`/admin/${wedding.slug}/convidados/lista`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lista de convidados' })).toBeVisible({
      timeout: 20_000,
    })

    const agrupar = page.getByRole('button', { name: 'Agrupar como acompanhantes' })

    // --- com um só marcado a ação não é oferecida ---
    //
    // Um núcleo de uma pessoa não agrupa nada, e é o estado que o banco passou
    // a dissolver — aceitar o clique e não fazer nada seria o pior desfecho.
    //
    // `toPass` na PRIMEIRA interação: a página é renderizada no servidor, e um
    // clique antes de o Vue hidratar não encontra listener e se perde.
    const caixaDaAna = page.getByRole('checkbox', { name: 'Selecionar Ana Solta' })
    await expect(async () => {
      await caixaDaAna.check()
      await expect(page.getByText('1 selecionado')).toBeVisible({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
    await expect(agrupar).toBeDisabled()

    // --- duas pessoas soltas: nada além do pedido, então nada a confirmar ---
    await page.getByRole('checkbox', { name: 'Selecionar Bruno Solto' }).check()
    await expect(page.getByText('2 selecionados')).toBeVisible()
    await expect(agrupar).toBeEnabled()
    await agrupar.click()

    // Sem diálogo: agrupar dois soltos é inequívoco. O rótulo derivado do
    // núcleo aparece na coluna Acompanhantes das duas linhas.
    await expect(page.getByText('Ana e Bruno').first()).toBeVisible({ timeout: 20_000 })

    // --- quem já tem núcleo traz o núcleo inteiro, e isso é avisado ---
    await page.getByRole('checkbox', { name: 'Selecionar Joao Par' }).check()
    await page.getByRole('checkbox', { name: 'Selecionar Ana Solta' }).check()
    await expect(page.getByText('2 selecionados')).toBeVisible()
    await agrupar.click()

    // Marcou 2, o resultado é 4: Maria vem com o Joao, Bruno vem com a Ana.
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toContainText('4')
    await expect(dialogo).toContainText('por já acompanhar alguém que você marcou')
    await expect(dialogo).toContainText('grupos de acompanhantes viram um')

    await dialogo.getByRole('button', { name: 'Agrupar', exact: true }).click()

    // Os quatro num núcleo só, rotulado pelos dois primeiros da fila.
    await expect(page.getByText('Joao e Maria +2').first()).toBeVisible({ timeout: 20_000 })

    const { data: agrupados } = await admin
      .from('convidados')
      .select('nome_completo, nucleo_id, ordem_nucleo')
      .eq('casamento_id', wedding.id)
      .order('ordem_nucleo', { ascending: true })

    const nucleos = new Set((agrupados ?? []).map((pessoa) => pessoa.nucleo_id))
    expect(nucleos.size).toBe(1)
    expect([...nucleos][0]).toBe(nucleo.id)
    expect((agrupados ?? []).map((pessoa) => pessoa.ordem_nucleo)).toEqual([0, 1, 2, 3])

    // O núcleo criado para Ana e Bruno foi dissolvido na fusão, não deixado
    // para trás como linha órfã.
    const { count: totalDeNucleos } = await admin
      .from('nucleos_acompanhantes')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)
    expect(totalDeNucleos).toBe(1)
  } finally {
    await admin.auth.admin.deleteUser(userId)
    await deleteTestWedding(admin, wedding.id)
  }
})
