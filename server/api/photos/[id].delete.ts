import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id da foto não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('photos')
    .delete()
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .select('id, storage_path')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Foto não encontrada.')
  }

  await client.storage.from('wedding-photos').remove([data.storage_path])

  await recordAuditLog(event, weddingId, memberId, {
    action: 'photo.delete',
    entityType: 'photo',
    entityId: data.id,
  })

  return { id: data.id }
})
