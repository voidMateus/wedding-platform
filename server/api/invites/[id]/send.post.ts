import { serverSupabaseClient } from '#supabase/server'

/** Marca o convite como enviado — registra sent_at e o evento na Linha do Tempo. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('invites')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!data) throw notFoundError('Convite não encontrado.')

  await client.from('invite_events').insert({
    wedding_id: weddingId,
    invite_id: id,
    event_type: 'token.sent',
    metadata: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.send',
    entityType: 'invite',
    entityId: id,
    metadata: {},
  })

  return data
})
