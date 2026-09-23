import { serverSupabaseClient } from '#supabase/server'
import { TAREFAS_SUGERIDAS } from '#shared/planejamento-tarefas'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import { prazoSugerido } from '#shared/utils/planejamento'

/**
 * Aplicar o cronograma padrão — o catálogo inteiro virando tarefas de uma vez.
 *
 * **Isto não quebra a regra de que sugestão não é linha no banco** (CLAUDE.md,
 * seção 12): o que a regra proíbe é a plataforma semear sozinha, e aqui quem
 * aplica é o casal, num clique explícito e confirmado. A checklist continua
 * nascendo vazia; o que mudou é que existe um caminho para não começar do zero
 * (rodada de usabilidade de 20/09/2026, ponto 9 — "cai aqui perdido demais").
 *
 * **O conteúdo é resolvido aqui, nunca aceito do client** — mesma regra de
 * `index.post.ts`: o que chega é a intenção, e título, prazo e chave saem do
 * catálogo em `shared/` e da data do evento.
 *
 * Só entra o que ainda não existe: o índice único parcial sobre
 * `origem_catalogo` já impediria a duplicata, mas deixar o insert falhar
 * inteiro por causa de uma tarefa que o casal já tinha criado à mão seria
 * transformar "aplicar o resto" em "não aplicar nada".
 *
 * Tarefa de fase já passada nasce **sem prazo**, como qualquer sugestão: quem
 * descobre o produto a quatro meses do casamento não ganha quinze linhas
 * vermelhas que descrevem um atraso que talvez não tenha.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [{ data: casamento }, { data: existentes, error: erroExistentes }] = await Promise.all([
    client.from('casamentos').select('data_evento').eq('id', weddingId).single(),
    client
      .from('tarefas')
      .select('origem_catalogo')
      .eq('casamento_id', weddingId)
      .not('origem_catalogo', 'is', null),
  ])

  if (erroExistentes) {
    throw badRequestError(erroExistentes.message)
  }

  const jaCriadas = new Set((existentes ?? []).map((tarefa) => tarefa.origem_catalogo))
  const hoje = hojeNoFusoDoEvento()

  const novas = TAREFAS_SUGERIDAS.filter((sugestao) => !jaCriadas.has(sugestao.chave)).map(
    (sugestao) => ({
      casamento_id: weddingId,
      titulo: sugestao.titulo,
      prazo: prazoSugerido(sugestao.fase, casamento?.data_evento ?? null, hoje),
      origem_catalogo: sugestao.chave,
    }),
  )

  if (novas.length === 0) {
    return { data: [] }
  }

  const { data, error } = await client.from('tarefas').insert(novas).select()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'planning.template.apply',
    entityType: 'task',
    // Não há uma entidade só: o que aconteceu foi a aplicação do modelo, e o
    // que a trilha precisa responder é "quantas, e quando".
    entityId: weddingId,
    metadata: { criadas: data.length },
  })

  setResponseStatus(event, 201)
  return { data }
})
