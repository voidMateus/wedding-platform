import { giftPaymentStatusQuerySchema } from '#shared/schemas/gift-payments'

/**
 * Status de uma tentativa de pagamento, pra tela de retorno do convidado
 * (CLAUDE.md, seção 18/28) — funciona como "pull": se ainda pending, aciona
 * confirmGiftPayment() como fallback pro caso do webhook nunca chegar.
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
    .from('gift_payments')
    .select('id, gift_id, status, amount_cents, quota_count, confirmed_at')
    .eq('id', paymentId)
    .maybeSingle()

  if (paymentError) {
    throw badRequestError(paymentError.message)
  }
  if (!payment) {
    throw notFoundError('Pagamento não encontrado.')
  }

  const resolved =
    payment.status === 'pending'
      ? await confirmGiftPayment(client, paymentId, {
          transactionNsu: query.transactionNsu,
          invoiceSlug: query.slug,
        })
      : payment

  const { data: gift } = await client.from('gifts').select('title').eq('id', payment.gift_id).maybeSingle()

  return {
    status: resolved?.status ?? payment.status,
    giftTitle: gift?.title ?? null,
    amountCents: payment.amount_cents,
    quotaCount: payment.quota_count,
    confirmedAt: resolved?.confirmed_at ?? null,
  }
})
