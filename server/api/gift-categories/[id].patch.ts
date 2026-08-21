import { serverSupabaseClient } from '#supabase/server'
import { giftCategoryInputSchema } from '#shared/schemas/gift-categories'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id da categoria não informado.')
  }
  const input = await validateBody(event, giftCategoryInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('categorias_presentes')
    .update({ nome: input.nome, ordem_exibicao: input.ordemExibicao })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Categoria não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift_category.update',
    entityType: 'gift_category',
    entityId: id,
    metadata: { name: data.nome },
  })

  return data
})
