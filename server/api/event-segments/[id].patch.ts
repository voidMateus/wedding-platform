import { serverSupabaseClient } from '#supabase/server'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do item do cronograma não informado.')
  }
  const input = await validateBody(event, eventSegmentInputSchema)

  const client = await serverSupabaseClient(event)

  const sameVenueAs = input.mesmoLocalQue || null
  if (sameVenueAs) {
    await validateSameVenueTarget(client, weddingId, sameVenueAs, id)
  }

  const { data, error } = await client
    .from('etapas_evento')
    .update({
      titulo: input.titulo,
      ...buildVenueColumns(input, sameVenueAs),
      mesmo_local_que: sameVenueAs,
      inicia_em: input.iniciaEm || null,
      termina_em: input.terminaEm || null,
      ordem_exibicao: input.ordemExibicao,
    })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Item do cronograma não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'event_segment.update',
    entityType: 'event_segment',
    entityId: data.id,
    metadata: { title: data.titulo },
  })

  return data
})
