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

  // Duas faixas, não as quatro do padrão: é o casamento que "não quer separar
  // em 4 mas em apenas 2", e é o cenário que pega a classe de bug do seletor de
  // categoria montado a partir do catálogo em vez das faixas ATIVAS do evento.
  const wedding = await createTestWedding(admin, {
    nomes_noivos: 'Teste E2E Modo Lista',
    config_faixas_etarias: {
      principal: [
        { chave: 'crianca', idadeMinima: 0, idadeMaxima: 11 },
        { chave: 'adulto', idadeMinima: 12, idadeMaxima: null },
      ],
    },
  })

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
    // para a folha, então sem a soma o cabeçalho diria "0/1" com 4 abaixo.
    // O rótulo é a fração da tela de Grupos ("confirmados/total confirmados"),
    // e ninguém aqui respondeu ao RSVP — daí o zero no numerador.
    const blocoRaiz = page.getByRole('button', { name: /^Familia do Mateus/ })
    await expect(blocoRaiz).toContainText('0/4 confirmados')

    const blocoSubdivisao = page.getByRole('button', { name: /^Tios paternos/ })
    await expect(blocoSubdivisao).toContainText('0/3 confirmados')

    // Núcleo não tem coluna de nome: o rótulo é derivado dos membros, na ordem
    // de `ordem_nucleo`, com o excedente resumido.
    await expect(page.getByText('Joao e Maria +1').first()).toBeVisible()

    // Rascunho fica fora da lista e fora do total: o cabeçalho anuncia os 4
    // convidados e o rascunho separado, nunca somados.
    // Os contadores vivem na linha do painel, ao lado do "N exibidas": um
    // descreve a lista inteira, o outro o recorte.
    await expect(page.getByText('4 convidados')).toBeVisible()
    await expect(page.getByText('1 em consideração')).toBeVisible()
    await expect(page.getByText('Marcelo da Academia')).toBeHidden()

    // A entrada rápida mora dentro do bloco e leva o grupo consigo.
    await expect(
      page.getByRole('button', { name: 'Adicionar convidado em Tios paternos' }),
    ).toBeVisible()

    // A barra de ações em massa só existe com seleção — no mesmo molde da barra
    // de salvar de Configurações. Sem nada marcado, ela não ocupa a base da
    // tela.
    await expect(page.getByText('selecionado', { exact: false })).toBeHidden()

    // `toPass` na PRIMEIRA interação da tela: a página é renderizada no
    // servidor, então a marcação existe antes de o Vue hidratar, e um clique
    // nesse intervalo não encontra listener e se perde em silêncio.
    const caixaDoJoao = page.getByRole('checkbox', { name: 'Selecionar Joao da Silva' })
    await expect(async () => {
      await caixaDoJoao.check()
      await expect(page.getByText('1 selecionado')).toBeVisible({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Limpar seleção' }).click()
    await expect(page.getByText('1 selecionado')).toBeHidden()

    // Categoria é editável só para quem NÃO tem data de nascimento — a faixa é
    // sempre derivada, e a manual perde para uma data válida.
    const categoriaDoJoao = page.getByRole('combobox', { name: 'Categoria de Joao da Silva' })
    await expect(categoriaDoJoao).toBeVisible()

    // E oferece só as faixas que ESTE casamento usa. O seletor era montado a
    // partir do catálogo da plataforma (sempre as quatro), então um evento com
    // duas faixas continuava oferecendo Adolescente e Idoso — uma escolha que
    // nenhuma outra tela exibe, porque a leitura resolve a faixa desligada para
    // a que herdou o território dela.
    await expect(async () => {
      await categoriaDoJoao.click()
      await expect(page.getByRole('option', { name: 'Adulto' })).toBeVisible({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
    await expect(page.getByRole('option')).toHaveCount(2)
    await expect(page.getByRole('option', { name: 'Adolescente' })).toBeHidden()
    await page.keyboard.press('Escape')

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
    await expect(blocoRaiz).toContainText('0/4 confirmados')

    await blocoRaiz.click()
    await expect(blocoSubdivisao).toBeVisible()

    // --- o menu da seção leva às duas formas de trabalhar ---
    //
    // As duas telas mostram o mesmo cadastro: sem o menu nas duas, trocar de
    // visão seria um caminho de mão única.
    const menuDaSecao = page.getByRole('navigation', { name: 'Seção atual' })
    await menuDaSecao.getByRole('link', { name: 'Visão Geral' }).click()
    await expect(page).toHaveURL(new RegExp(`/convidados$`), { timeout: 10_000 })
    // O `h1` é o mesmo nas duas visões — elas compartilham o cabeçalho de
    // propósito, então quem diz onde se está é o item aceso do menu e o
    // segmentado, não o título.
    await expect(page.getByRole('heading', { level: 1, name: 'Lista de convidados' })).toBeVisible()
    await expect(menuDaSecao.getByRole('link', { name: 'Visão Geral' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByText('Carlos Direto').first()).toBeVisible()

    await menuDaSecao.getByRole('link', { name: 'Modo lista' }).click()
    await expect(page).toHaveURL(new RegExp(`/convidados/lista$`), { timeout: 10_000 })
    await expect(page.getByRole('heading', { level: 1, name: 'Lista de convidados' })).toBeVisible()
  } finally {
    await deleteTestWedding(admin, wedding.id)
    await admin.auth.admin.deleteUser(userId)
  }
})
