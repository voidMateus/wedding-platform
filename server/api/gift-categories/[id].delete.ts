import { serverSupabaseClient } from '#supabase/server'

/**
 * Exclusão física — gifts.category_id usa ON DELETE SET NULL, então
 * presentes existentes só perdem a categoria, sem quebrar nenhuma
 * referência histórica (diferente de guest_groups, CLAUDE.md seção 11).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id da categoria não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('gift_categories')
    .delete()
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .select('id, name')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Categoria não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift_category.delete',
    entityType: 'gift_category',
    entityId: id,
    metadata: { name: data.name },
  })

  return { id }
})
