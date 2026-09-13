import { serverSupabaseClient } from '#supabase/server'
import { inviteTagInputSchema } from '#shared/schemas/invites'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, inviteTagInputSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('etiquetas_convite')
    .insert({ casamento_id: weddingId, nome: input.nome })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw conflictError('Já existe uma etiqueta com este nome.')
    }
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite_tag.create',
    entityType: 'invite_tag',
    entityId: data.id,
    metadata: { nome: input.nome },
  })

  setResponseStatus(event, 201)
  return data
})
