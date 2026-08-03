import { serverSupabaseClient } from '#supabase/server'
import { z } from 'zod'

const bodySchema = z.object({ archived: z.boolean() })

/** Arquiva/desarquiva o convite — independente de status, permite consulta histórica sem exclusão. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }
  const { archived } = await validateBody(event, bodySchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('invites')
    .update({ archived_at: archived ? new Date().toISOString() : null })
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
    event_type: archived ? 'invite.archived' : 'invite.unarchived',
    metadata: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: archived ? 'invite.archive' : 'invite.unarchive',
    entityType: 'invite',
    entityId: id,
    metadata: {},
  })

  return data
})
