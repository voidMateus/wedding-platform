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
    .from('grupos')
    .update({
      nome: input.nome,
      cor: input.cor ?? null,
    })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
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
    metadata: { name: data.nome },
  })

  return data
})
