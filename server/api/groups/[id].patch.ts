import { serverSupabaseClient } from '#supabase/server'
import { groupInputSchema } from '#shared/schemas/groups'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do grupo não informado.')
  }
  const input = await validateBody(event, groupInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('groups')
    .update({
      name: input.name,
      color: input.color ?? null,
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
    action: 'group.update',
    entityType: 'group',
    entityId: data.id,
    metadata: { name: data.name },
  })

  return data
})
