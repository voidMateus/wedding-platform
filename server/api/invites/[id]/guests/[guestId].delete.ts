import { serverSupabaseClient } from '#supabase/server'

/** Desvincula um convidado do convite (convite_id = null) — nunca exclui o convidado. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  const guestId = getRouterParam(event, 'guestId')
  if (!id || !guestId) {
    throw badRequestError('id do convite/convidado não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('convidados')
    .update({ convite_id: null })
    .eq('id', guestId)
    .eq('convite_id', id)
    .eq('casamento_id', weddingId)
    .select('id, nome_completo')
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!data) throw notFoundError('Convidado não encontrado neste convite.')

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.remove_guest',
    entityType: 'invite',
    entityId: id,
    metadata: { guestId, fullName: data.nome_completo },
  })

  return { id: guestId }
})
