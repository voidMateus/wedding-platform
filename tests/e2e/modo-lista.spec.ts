import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'

/**
 * Modo Lista: a lista agrupada em blocos recolhíveis.
 *
 * Por que E2E e não teste de componente: o que quase deu errado aqui não foi a
 * marcação nem a regra de agrupamento (as duas cobertas por unitário), foi o
 * **carregamento** — a tela monta a lista inteira com um laço de páginas
 * imperativo, e na renderização no servidor o `$fetch` não repassava o cookie
 * de sessão. O sintoma era "a lista não carrega", sem erro no log do servidor e
 * sem falha de rede no navegador; typecheck, lint e 752 asserções unitárias
 * passavam. Só abrir a tela de verdade, autenticado, pega essa classe de bug.
 *
 * Auto-suficiente, no molde de casamento-ativo.spec.ts: cria o próprio
 * casamento, o próprio usuário e a própria hierarquia de grupos, e limpa tudo
 * ao final — nada depende de dado de dev nem de credencial conhecida.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

const TEST_PASSWORD = 'teste-e2e-senha-fake-123!'

test('Modo Lista agrupa por grupo, soma as subdivisões e recolhe a árvore', async ({ page }) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  const wedding = await createTestWedding(admin, { nomes_noivos: 'Teste E2E Modo Lista' })

  const email = `teste-e2e-modo-lista-${Date.now()}@example.com`
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
    // --- hierarquia: um grupo raiz com uma subdivisão dentro ---
    const { data: raiz } = await admin
      .from('grupos')
      .insert({ casamento_id: wedding.id, nome: 'Familia do Mateus' })
      .select('id')
      .single()
    if (!raiz) throw new Error('Falha ao criar grupo raiz de teste.')

    const { data: subdivisao } = await admin
      .from('grupos')
      .insert({ casamento_id: wedding.id, nome: 'Tios paternos', grupo_pai_id: raiz.id })
      .select('id')
      .single()
    if (!subdivisao) throw new Error('Falha ao criar subdivisão de teste.')

    const { data: nucleo } = await admin
      .from('nucleos_acompanhantes')
      .insert({ casamento_id: wedding.id })
      .select('id')
      .single()
    if (!nucleo) throw new Error('Falha ao criar núcleo de teste.')

    // Uma a uma: no PostgREST o insert em lote exige que todas as linhas
    // tenham as MESMAS chaves, e estas variam de propósito.
    const pessoas = [
      {
        nome_completo: 'Joao da Silva',
        grupo_id: subdivisao.id,
        nucleo_id: nucleo.id,
        ordem_nucleo: 0,
      },
      {
        nome_completo: 'Maria da Silva',
        grupo_id: subdivisao.id,
        nucleo_id: nucleo.id,
        ordem_nucleo: 1,
      },
      {
        nome_completo: 'Pedro da Silva',
        grupo_id: subdivisao.id,
        nucleo_id: nucleo.id,
        ordem_nucleo: 2,
      },
      { nome_completo: 'Carlos Direto', grupo_id: raiz.id },
      { nome_completo: 'Marcelo da Academia', em_consideracao: true },
    ]
    for (const pessoa of pessoas) {
      const { error } = await admin
        .from('convidados')
        .insert({ casamento_id: wedding.id, ...pessoa })
      if (error) {
        throw new Error(`Falha ao inserir ${pessoa.nome_completo}: ${error.message}`)
      }
    }

    // --- login ---
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

    // O grupo-pai anuncia a SOMA das subdivisões: o convidado aponta sempre
    // para a folha, então sem a soma o cabeçalho diria "1 pessoa" com 4 abaixo.
    const blocoRaiz = page.getByRole('button', { name: /Familia do Mateus/ })
    await expect(blocoRaiz).toContainText('4 pessoas')

    const blocoSubdivisao = page.getByRole('button', { name: /Tios paternos/ })
    await expect(blocoSubdivisao).toContainText('3 pessoas')

    // Núcleo não tem coluna de nome: o rótulo é derivado dos membros, na ordem
    // de `ordem_nucleo`, com o excedente resumido.
    await expect(page.getByText('Joao e Maria +1').first()).toBeVisible()

    // Rascunho fica fora da lista e fora das contagens — aparece no painel.
    await expect(page.getByText('Marcelo da Academia')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Rascunho da lista' })).toBeVisible()

    // --- recolher o pai recolhe a árvore ---
    //
    // `toPass` em volta do clique, e não um clique só: a página é renderizada
    // no servidor, então a marcação (com as contagens) existe ANTES de o Vue
    // hidratar — e um clique nesse intervalo não encontra listener nenhum e se
    // perde em silêncio. Sem o retry o teste falhava de forma intermitente,
    // parecendo bug do recolher.
    await expect(async () => {
      await blocoRaiz.click()
      await expect(blocoSubdivisao).toBeHidden({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })

    // O cabeçalho do pai continua, com a contagem cheia: é por ele que se reabre.
    await expect(blocoRaiz).toContainText('4 pessoas')

    await blocoRaiz.click()
    await expect(blocoSubdivisao).toBeVisible()

    // --- o menu da seção leva às duas formas de trabalhar ---
    //
    // As duas telas mostram o mesmo cadastro: sem o menu nas duas, trocar de
    // visão seria um caminho de mão única.
    await page.getByRole('link', { name: 'Visão organizada' }).click()
    await expect(page).toHaveURL(new RegExp(`/convidados$`), { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Convidados', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Carlos Direto').first()).toBeVisible()

    await page.getByRole('link', { name: 'Modo lista' }).click()
    await expect(page).toHaveURL(new RegExp(`/convidados/lista$`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { level: 1, name: 'Lista de convidados' })).toBeVisible()
  } finally {
    await deleteTestWedding(admin, wedding.id)
    await admin.auth.admin.deleteUser(userId)
  }
})
