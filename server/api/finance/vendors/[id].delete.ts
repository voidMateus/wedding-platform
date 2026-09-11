import { serverSupabaseClient } from '#supabase/server'

/**
 * Arquiva o fornecedor (soft delete — despesas e documentos referenciam).
 *
 * Recusa enquanto houver despesa ativa ligada: o histórico de quem recebeu o
 * dinheiro é justamente o que o casal vai querer consultar depois.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Fornecedor não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { count, error: contagemError } = await client
    .from('despesas')
    .select('id', { count: 'exact', head: true })
    .eq('casamento_id', weddingId)
    .eq('fornecedor_id', id)
    .is('excluido_em', null)

  if (contagemError) {
    throw badRequestError(contagemError.message)
  }

  if (count && count > 0) {
    throw conflictError(
      `Este fornecedor tem ${count} despesa${count === 1 ? '' : 's'} ativa${count === 1 ? '' : 's'}. Desvincule antes de arquivar.`,
    )
  }

  const { data, error } = await client
    .from('fornecedores')
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
    throw notFoundError('Fornecedor não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.vendor.delete',
    entityType: 'vendor',
    entityId: id,
  })

  return { id }
})
