import { serverSupabaseClient } from '#supabase/server'

// Exclusão física direta: diferente de guest_groups, nada referencia
// event_segments por FK, e cronograma não tem valor histórico por convidado
// para preservar (CLAUDE.md, seção 11 — soft delete é para guests/gifts,
// e guest_groups por causa do RESTRICT em guests.group_id).
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do item do cronograma não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('event_segments')
    .delete()
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .select('id, title')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Item do cronograma não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'event_segment.delete',
    entityType: 'event_segment',
    entityId: data.id,
    metadata: { title: data.title },
  })

  return { id: data.id }
})
