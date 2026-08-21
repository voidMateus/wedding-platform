import { giftPaymentStatusQuerySchema } from '#shared/schemas/gift-payments'

/**
 * Status de uma tentativa de pagamento, pra tela de retorno do convidado
 * (CLAUDE.md, seção 18/28) — funciona como "pull": se ainda pendente,
 * aciona confirmGiftPayment() como fallback pro caso do webhook nunca chegar.
 *
 * Sem token de convite — o próprio `paymentId` (UUID gerado por nós no
 * checkout, nunca listado publicamente) já funciona como credencial de
 * acesso a este status, mesmo padrão de link de acompanhamento de pedido
 * usado em checkouts de convidado no e-commerce em geral.
 */
export default defineEventHandler(async (event) => {
  const paymentId = getRouterParam(event, 'id')
  if (!paymentId) {
    throw badRequestError('id do pagamento não informado.')
  }
  const query = validateQuery(event, giftPaymentStatusQuerySchema)

  const client = supabaseAdmin(event)

  const { data: payment, error: paymentError } = await client
    .from('pagamentos_presentes')
    .select('id, presente_id, status_pagamento, valor_centavos, quantidade_cotas, confirmado_em')
    .eq('id', paymentId)
    .maybeSingle()

  if (paymentError) {
    throw badRequestError(paymentError.message)
  }
  if (!payment) {
    throw notFoundError('Pagamento não encontrado.')
  }

  const resolved =
    payment.status_pagamento === 'pendente'
      ? await confirmGiftPayment(client, paymentId, {
          transactionNsu: query.nsuTransacao,
          invoiceSlug: query.slug,
        })
      : payment

  const { data: gift } = await client.from('presentes').select('titulo').eq('id', payment.presente_id).maybeSingle()

  return {
    status: resolved?.status_pagamento ?? payment.status_pagamento,
    giftTitle: gift?.titulo ?? null,
    amountCents: payment.valor_centavos,
    quotaCount: payment.quantidade_cotas,
    confirmedAt: resolved?.confirmado_em ?? null,
  }
})
