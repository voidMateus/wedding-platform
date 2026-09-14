import { serverSupabaseClient } from '#supabase/server'
import { taskInputSchema } from '#shared/schemas/planejamento'
import { tarefaSugeridaPorChave } from '#shared/planejamento-tarefas'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import { prazoSugerido } from '#shared/utils/planejamento'

/**
 * Cria uma tarefa — digitada do zero, ou vinda de uma sugestão do catálogo.
 *
 * **O título e o prazo de uma sugestão são resolvidos AQUI, nunca aceitos do
 * client.** O que chega é a chave; o conteúdo vem do catálogo em `shared/` e da
 * data do evento. É o mesmo princípio que já vale nos presentes ("valor e
 * quantidade são sempre recalculados no servidor"): o client manda a intenção,
 * não o conteúdo.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, taskInputSchema)

  const client = await serverSupabaseClient(event)

  let titulo = input.titulo?.trim() ?? ''
  let prazo = input.prazo ?? null
  let origemCatalogo: string | null = null

  if (input.chaveCatalogo) {
    const sugestao = tarefaSugeridaPorChave(input.chaveCatalogo)
    // Chave desconhecida é 400, e não uma tarefa com título vazio: o catálogo é
    // fechado, e uma chave que não existe nele só chega por engano de código.
    if (!sugestao) {
      throw badRequestError('Sugestão desconhecida.')
    }

    const { data: casamento } = await client
      .from('casamentos')
      .select('data_evento')
      .eq('id', weddingId)
      .single()

    origemCatalogo = sugestao.chave
    titulo = input.titulo?.trim() || sugestao.titulo
    // Sugestão de fase já passada nasce SEM prazo (`prazoSugerido` devolve
    // null): o sistema não inventa um atraso para quem descobriu o produto a
    // quatro meses do casamento.
    prazo =
      input.prazo !== undefined
        ? (input.prazo ?? null)
        : prazoSugerido(sugestao.fase, casamento?.data_evento ?? null, hojeNoFusoDoEvento())
  }

  const { data, error } = await client
    .from('tarefas')
    .insert({
      casamento_id: weddingId,
      titulo,
      prazo,
      responsavel: input.responsavel ?? null,
      observacao: input.observacao ?? null,
      origem_catalogo: origemCatalogo,
    })
    .select()
    .single()

  if (error) {
    // O índice único parcial é o que impede o clique duplo numa sugestão de
    // virar duas tarefas — e 409 diz isso, em vez de deixar a tela achar que
    // foi erro de validação.
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Essa tarefa já está na lista.' })
    }
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'planning.task.create',
    entityType: 'task',
    entityId: data.id,
    metadata: { titulo: data.titulo, origemCatalogo },
  })

  setResponseStatus(event, 201)
  return data
})
