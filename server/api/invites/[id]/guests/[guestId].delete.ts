import { serverSupabaseClient } from '#supabase/server'

/** Desvincula um convidado do convite (invite_id = null) — nunca exclui o convidado. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  const guestId = getRouterParam(event, 'guestId')
  if (!id || !guestId) {
    throw badRequestError('id do convite/convidado não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('guests')
    .update({ invite_id: null })
    .eq('id', guestId)
    .eq('invite_id', id)
    .eq('wedding_id', weddingId)
    .select('id, full_name')
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!data) throw notFoundError('Convidado não encontrado neste convite.')

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.remove_guest',
    entityType: 'invite',
    entityId: id,
    metadata: { guestId, fullName: data.full_name },
  })

  return { id: guestId }
})
