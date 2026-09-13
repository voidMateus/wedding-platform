import { serverSupabaseClient } from '#supabase/server'
import { installmentPatchSchema } from '#shared/schemas/finance'

/**
 * Edita uma parcela — inclusive marcar como paga, que é só gravar `pago_em`.
 *
 * Não existe endpoint "pagar": pagamento é um fato com data, e a data é o
 * estado. Desmarcar é mandar `pagoEm: null`.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Parcela não informada.')
  }

  const input = await validateBody(event, installmentPatchSchema)

  const atualizacao: Record<string, unknown> = {}
  if (input.venceEm !== undefined) atualizacao.vence_em = input.venceEm
  if (input.valorCentavos !== undefined) atualizacao.valor_centavos = input.valorCentavos
  if (input.pagoEm !== undefined) atualizacao.pago_em = input.pagoEm ?? null
  if (input.formaPagamento !== undefined) atualizacao.forma_pagamento = input.formaPagamento ?? null
  if (input.observacao !== undefined) atualizacao.observacao = input.observacao ?? null

  if (Object.keys(atualizacao).length === 0) {
    throw badRequestError('Nada para atualizar.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('parcelas_despesa')
    .update(atualizacao)
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Parcela não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: data.pago_em ? 'finance.installment.pay' : 'finance.installment.update',
    entityType: 'installment',
    entityId: data.id,
    metadata: { valorCentavos: data.valor_centavos },
  })

  return data
})
