import { serverSupabaseClient } from '#supabase/server'
import { groupInputSchema } from '#shared/schemas/groups'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, groupInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('grupos')
    .insert({
      casamento_id: weddingId,
      nome: input.nome,
      cor: input.cor ?? null,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'group.create',
    entityType: 'group',
    entityId: data.id,
    metadata: { name: data.nome },
  })

  setResponseStatus(event, 201)
  return data
})
