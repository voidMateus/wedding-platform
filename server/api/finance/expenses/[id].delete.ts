import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete da despesa (valor histórico financeiro).
 *
 * As parcelas continuam na tabela: a FK é `on delete cascade`, então
 * restaurar a despesa devolve o parcelamento inteiro. Elas somem dos totais
 * porque toda leitura parte das despesas ativas.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Despesa não informada.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('despesas')
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
    throw notFoundError('Despesa não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.expense.delete',
    entityType: 'expense',
    entityId: id,
  })

  return { id }
})
