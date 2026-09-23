import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { TAREFAS_SUGERIDAS } from '#shared/planejamento-tarefas'

/**
 * O cronograma padrão, e as janelas por contagem regressiva.
 *
 * A checklist abria vazia por decisão registrada, e o casal "cai aqui perdido
 * demais" (rodada de usabilidade de 20/09/2026, ponto 9). O que mudou não foi a
 * regra — nada nasce sem o clique do casal — foi passar a existir um caminho
 * para não começar do zero: com a conta antes e o desfazer depois.
 *
 * E as janelas deixaram de medir a distância até HOJE ("Próximos 30 dias") para
 * medir a distância até o EVENTO ("6 meses antes"), que é como se fala de
 * casamento. O eixo continua sendo o tempo.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

let conta: ContaDeTeste

test.beforeAll(async () => {
  // Data distante: com o casamento a mais de um ano, o catálogo inteiro tem
  // prazo no futuro e as faixas de meses todas existem.
  conta = await criarContaDeTeste({ data_evento: '2028-06-12' })
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('o cronograma padrão nasce por clique, diz quantas e desfaz', async ({ page }) => {
  test.setTimeout(180_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/planejamento`)

  const comecar = page.getByRole('button', { name: 'Começar com o cronograma padrão' })
  await expect(comecar).toBeVisible({ timeout: 20_000 })

  // --- a conta vem ANTES: o número é a parte surpreendente ---
  await expect(async () => {
    await comecar.click({ timeout: 3_000 })
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  const confirmar = page.getByRole('button', { name: `Criar ${TAREFAS_SUGERIDAS.length} tarefas` })
  await expect(confirmar).toBeVisible()

  await confirmar.click()

  // O toast é o fato visível de que as tarefas existem. Sem esperá-lo, a
  // consulta ao banco lá embaixo corre com a requisição e lê zero — e a
  // asserção sobre as janelas passaria mesmo assim, porque os grupos também
  // desenham SUGESTÕES.
  await expect(page.getByText(/tarefas criadas\.$/)).toBeVisible({ timeout: 30_000 })

  // --- as janelas falam em meses antes, não em "próximos 30 dias" ---
  await expect(page.getByText('12 meses antes')).toBeVisible()
  await expect(page.getByText('Semana do casamento')).toBeVisible()
  // Nenhum GRUPO se chama assim: "Próximos 30 dias" sobrevive como métrica no
  // topo (a pergunta "o que merece atenção agora?"), mas deixou de ser régua de
  // agrupamento. O cabeçalho de grupo é um botão; a métrica, não.
  await expect(page.getByRole('button', { name: /Próximos 30 dias/ })).toHaveCount(0)

  const { count: criadas } = await conta.admin
    .from('tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('casamento_id', conta.casamentoId)

  expect(criadas).toBe(TAREFAS_SUGERIDAS.length)

  // --- recolher tudo fecha os grupos, e expandir devolve ---
  //
  // Com dez faixas de meses, percorrer a lista sem um atalho custa uma rolagem
  // longa — e o botão só existe porque o estado saiu de dentro de cada grupo
  // para a página: dez refs independentes não têm como ser alcançados juntos.
  const recolherTudo = page.getByRole('button', { name: 'Recolher tudo' })
  await expect(recolherTudo).toBeVisible()

  // Uma tarefa do primeiro grupo aberto — o que se recolhe é o conteúdo, e é
  // ele que precisa sumir. Contar `aria-expanded` pegaria também os controles
  // da chrome do painel.
  // O título da tarefa é um CAMPO editável no lugar, não texto: por rótulo.
  const primeiraTarefa = page.getByLabel(`Tarefa ${TAREFAS_SUGERIDAS[0]!.titulo}`).first()
  await expect(primeiraTarefa).toBeVisible()

  await recolherTudo.click()
  await expect(primeiraTarefa).toBeHidden()

  await page.getByRole('button', { name: 'Expandir tudo' }).click()
  await expect(primeiraTarefa).toBeVisible()

  // --- e desfazer devolve a tela ao que era ---
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(page.getByRole('button', { name: 'Começar com o cronograma padrão' })).toBeVisible({
    timeout: 30_000,
  })

  const { count: depois } = await conta.admin
    .from('tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('casamento_id', conta.casamentoId)

  expect(depois).toBe(0)
})
