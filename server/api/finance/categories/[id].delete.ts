import { serverSupabaseClient } from '#supabase/server'

/**
 * Arquiva a categoria (soft delete — `despesas.categoria_id` e
 * `fornecedores.categoria_id` referenciam a linha).
 *
 * Recusa enquanto houver despesa ativa nela: a alternativa seria mover as
 * despesas para "Sem categoria" por conta própria, e apagar silenciosamente a
 * classificação de R$ 20.000 é decisão do casal, não do endpoint.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Categoria não informada.')
  }

  const client = await serverSupabaseClient(event)

  const { count, error: contagemError } = await client
    .from('despesas')
    .select('id', { count: 'exact', head: true })
    .eq('casamento_id', weddingId)
    .eq('categoria_id', id)
    .is('excluido_em', null)

  if (contagemError) {
    throw badRequestError(contagemError.message)
  }

  if (count && count > 0) {
    throw conflictError(
      `Esta categoria ainda tem ${count} despesa${count === 1 ? '' : 's'}. Mova ou exclua antes de arquivar.`,
    )
  }

  const { data, error } = await client
    .from('categorias_orcamento')
    .update({ excluido_em: new Date().toISOString() })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Categoria não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.category.delete',
    entityType: 'budget_category',
    entityId: id,
  })

  return { id }
})
