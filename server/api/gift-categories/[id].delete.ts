import { serverSupabaseClient } from '#supabase/server'

/**
 * Exclusão física — presentes.categoria_id usa ON DELETE SET NULL, então
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
    .from('categorias_presentes')
    .delete()
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id, nome')
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
    metadata: { name: data.nome },
  })

  return { id }
})
