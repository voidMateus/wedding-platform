import { serverSupabaseClient } from '#supabase/server'
import { guestInputSchema } from '#shared/schemas/guests'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convidado não informado.')
  }
  const input = await validateBody(event, guestInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('guests')
    .update({
      group_id: input.groupId,
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      is_child: input.isChild,
      dietary_restrictions: input.dietaryRestrictions || null,
    })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw conflictError('Já existe um convidado com este e-mail neste casamento.')
    }
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Convidado não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.update',
    entityType: 'guest',
    entityId: data.id,
    metadata: { fullName: data.full_name },
  })

  return data
})
