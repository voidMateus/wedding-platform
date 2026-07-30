import { serverSupabaseClient } from '#supabase/server'
import { guestInputSchema } from '#shared/schemas/guests'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('guests')
    .insert({
      wedding_id: weddingId,
      group_id: input.groupId,
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      is_child: input.isChild,
      dietary_restrictions: input.dietaryRestrictions || null,
    })
    .select()
    .single()

  if (error) {
    // Colisão do índice único parcial (wedding_id, email) — CLAUDE.md, seção 11.
    if (error.code === '23505') {
      throw conflictError('Já existe um convidado com este e-mail neste casamento.')
    }
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.create',
    entityType: 'guest',
    entityId: data.id,
    metadata: { fullName: data.full_name },
  })

  setResponseStatus(event, 201)
  return data
})
