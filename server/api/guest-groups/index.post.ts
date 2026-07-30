import { serverSupabaseClient } from '#supabase/server'
import { guestGroupInputSchema } from '#shared/schemas/guest-groups'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestGroupInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('guest_groups')
    .insert({
      wedding_id: weddingId,
      name: input.name,
      max_members: input.maxMembers,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_group.create',
    entityType: 'guest_group',
    entityId: data.id,
    metadata: { name: data.name },
  })

  setResponseStatus(event, 201)
  return data
})
