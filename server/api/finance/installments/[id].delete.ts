import { serverSupabaseClient } from '#supabase/server'

/** Exclusão física: a parcela não tem valor histórico fora da despesa dela. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Parcela não informada.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('parcelas_despesa')
    .delete()
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Parcela não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.installment.delete',
    entityType: 'installment',
    entityId: id,
  })

  return { id }
})
