/**
 * Webhook de confirmação de pagamento da InfinitePay (CLAUDE.md, seção 28) —
 * sem autenticação, porque a InfinitePay não documenta assinatura para este
 * fluxo. Por isso o corpo recebido NUNCA é tratado como prova de pagamento:
 * serve só para localizar a linha (via order_nsu, que é o próprio id gerado
 * por nós em checkout.post.ts) e disparar confirmGiftPayment(), que
 * reverifica servidor-a-servidor antes de qualquer efeito.
 *
 * Sempre responde 200 rapidamente, mesmo se a confirmação falhar
 * internamente — um não-200 causa reenvio agressivo pela InfinitePay, e um
 * erro nosso não deve virar um loop de retries.
 */
export default defineEventHandler(async (event) => {
  setResponseStatus(event, 200)

  try {
    const body = await readBody<{
      order_nsu?: string
      transaction_nsu?: string
      invoice_slug?: string
    }>(event)
    const paymentId = body?.order_nsu
    if (!paymentId) {
      console.error('[gift-payments webhook] payload sem order_nsu')
      return { success: true }
    }

    const client = supabaseAdmin(event)
    await confirmGiftPayment(client, paymentId, {
      transactionNsu: body.transaction_nsu,
      invoiceSlug: body.invoice_slug,
    })
  } catch (err) {
    console.error('[gift-payments webhook] falha ao processar', err)
  }

  return { success: true }
})
