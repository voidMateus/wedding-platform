import { serverSupabaseClient } from '#supabase/server'
import { guestGroupInputSchema } from '#shared/schemas/guest-groups'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do grupo não informado.')
  }
  const input = await validateBody(event, guestGroupInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('guest_groups')
    .update({
      name: input.name,
      max_members: input.maxMembers,
      notes: input.notes || null,
    })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Grupo não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_group.update',
    entityType: 'guest_group',
    entityId: data.id,
    metadata: { name: data.name },
  })

  return data
})
