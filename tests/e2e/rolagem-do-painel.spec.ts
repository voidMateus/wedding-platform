import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'

/**
 * O painel é um app shell de altura de tela: quem rola é o `<main>`, e o
 * DOCUMENTO nunca deveria rolar. Este teste guarda essa promessa com uma lista
 * longa, que é a única condição em que ela quebra.
 *
 * O defeito real que ele existe para pegar (reportado pelo usuário em
 * 2026-09-10, "a tela rola infinitamente"): `sr-only` do Tailwind é
 * `position: absolute`, e sem um ancestral posicionado o bloco contêiner de um
 * absoluto passa a ser o bloco contêiner INICIAL — o elemento escapa de
 * qualquer `overflow` no caminho e se assenta na posição estática dele no
 * documento. Os rótulos acessíveis das ações de linha vazavam da grade (que
 * tem `max-height: 60vh`), e o último, na linha 196, ficava a 5646px do topo:
 * exatamente a altura de rolagem que o documento passava a ter, com a página
 * rolando para um vazio enorme abaixo do painel.
 *
 * Por que E2E e não unitário: a falha é geométrica. Nenhuma asserção de
 * marcação a alcança — só o navegador calculando layout de verdade. E a
 * asserção é a promessa (o documento não rola), não a correção (`relative` no
 * botão), então ela continua valendo para o próximo elemento absoluto que
 * alguém acrescentar.
 *
 * Precisa de MUITAS linhas: com poucas, a grade caberia na tela e o teste
 * passaria mesmo com o defeito de volta.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

const TEST_PASSWORD = 'teste-e2e-senha-fake-123!'
const CONVIDADOS = 60

test('com lista longa, o documento do painel continua sem rolar', async ({ page }) => {
  test.setTimeout(120_000)
  const admin = getServiceRoleClient()

  const wedding = await createTestWedding(admin, { nomes_noivos: 'Teste E2E Rolagem' })

  const email = `teste-e2e-rolagem-${Date.now()}@example.com`
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
    // Em lote: todas as linhas têm as mesmas chaves, então o PostgREST aceita
    // de uma vez (ao contrário da massa variada de modo-lista.spec.ts).
    const { error: guestsError } = await admin.from('convidados').insert(
      Array.from({ length: CONVIDADOS }, (_, i) => ({
        casamento_id: wedding.id,
        nome_completo: `Convidado Numero ${String(i).padStart(3, '0')}`,
      })),
    )
    if (guestsError) throw new Error(`Falha ao inserir a massa: ${guestsError.message}`)

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
    await expect(page.getByText(`${CONVIDADOS} convidados`)).toBeVisible({ timeout: 20_000 })

    // A prova: tentar ir ao fim do documento não move nada. Rolar de verdade é
    // o sintoma que o usuário viu, e é o que precisa continuar impossível.
    const rolagem = await page.evaluate(() => {
      window.scrollTo(0, 99_999)
      const doc = document.documentElement
      return {
        scrollY: window.scrollY,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
      }
    })

    expect(rolagem.scrollY).toBe(0)
    // Com o defeito, a diferença era de milhares de pixels; a folga aqui é só
    // para arredondamento de zoom/barra de rolagem.
    expect(rolagem.scrollHeight - rolagem.clientHeight).toBeLessThanOrEqual(4)

    // E a grade continua rolando por dentro — a contenção não pode ter sido
    // obtida escondendo a lista.
    const grade = await page.evaluate(() => {
      const el = document.querySelector('main .table-scroll') as HTMLElement | null
      return el ? { clientHeight: el.clientHeight, scrollHeight: el.scrollHeight } : null
    })
    expect(grade).not.toBeNull()
    expect(grade!.scrollHeight).toBeGreaterThan(grade!.clientHeight)
  } finally {
    await admin.auth.admin.deleteUser(userId)
    await deleteTestWedding(admin, wedding.id)
  }
})
