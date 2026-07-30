import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete (CLAUDE.md, seção 11) — preserva o histórico em
 * gift_reservations/gift_contributions mesmo após o presente ser removido
 * da vitrine/CRUD ativo.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('gifts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .select('id, title')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Presente não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift.delete',
    entityType: 'gift',
    entityId: id,
    metadata: { title: data.title },
  })

  return { id }
})
