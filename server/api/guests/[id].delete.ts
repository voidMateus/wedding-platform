import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete — preserva o histórico de RSVP/presentes associados
 * (CLAUDE.md, seção 11/15.3). Sem regra de cascata como guest_groups: o
 * convidado não é referenciado por nada que precise de realocação prévia.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convidado não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('guests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .select('id, full_name')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Convidado não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.delete',
    entityType: 'guest',
    entityId: data.id,
    metadata: { fullName: data.full_name },
  })

  return { id: data.id }
})
