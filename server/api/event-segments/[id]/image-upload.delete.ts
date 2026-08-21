import { serverSupabaseClient } from '#supabase/server'

const ALL_EXTENSIONS = ['jpg', 'png', 'webp']

/** Remove a foto do local — sempre opcional, o casal pode voltar ao estado sem foto. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do item do cronograma não informado.')
  }

  const client = await serverSupabaseClient(event)

  await client.storage
    .from('wedding-event-segments')
    .remove(ALL_EXTENSIONS.map((ext) => `${weddingId}/${id}.${ext}`))

  const { error } = await client
    .from('etapas_evento')
    .update({ url_imagem: null })
    .eq('id', id)
    .eq('casamento_id', weddingId)

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'event_segment.image_remove',
    entityType: 'event_segment',
    entityId: id,
  })

  return { removed: true }
})
