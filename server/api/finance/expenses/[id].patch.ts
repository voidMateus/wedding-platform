import { serverSupabaseClient } from '#supabase/server'
import { expensePatchSchema } from '#shared/schemas/finance'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Despesa não informada.')
  }

  const input = await validateBody(event, expensePatchSchema)

  const atualizacao: Record<string, unknown> = {}
  if (input.descricao !== undefined) atualizacao.descricao = input.descricao
  if (input.valorCentavos !== undefined) atualizacao.valor_centavos = input.valorCentavos
  if (input.categoriaId !== undefined) atualizacao.categoria_id = input.categoriaId ?? null
  if (input.fornecedorId !== undefined) atualizacao.fornecedor_id = input.fornecedorId ?? null
  if (input.observacao !== undefined) atualizacao.observacao = input.observacao ?? null

  if (Object.keys(atualizacao).length === 0) {
    throw badRequestError('Nada para atualizar.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('despesas')
    .update(atualizacao)
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Despesa não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.expense.update',
    entityType: 'expense',
    entityId: data.id,
  })

  return data
})
