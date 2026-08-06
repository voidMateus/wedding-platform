import { randomUUID } from 'node:crypto'
import { giftCheckoutSchema } from '#shared/schemas/gift-payments'

/**
 * Cria uma tentativa de pagamento online via InfinitePay (CLAUDE.md, seção
 * 18/28) — presente físico pago (kind='reservation') ou contribuição em
 * dinheiro (kind='contribution', valor livre ou cotas fixas). O valor
 * cobrado é SEMPRE calculado aqui no servidor a partir do próprio `gift`,
 * nunca aceito do client, exceto na contribuição de valor livre. Não efetiva
 * nenhuma reserva/contribuição — isso só acontece em confirm_gift_payment(),
 * depois de o pagamento ser confirmado (webhook ou status.get.ts). Pix e/ou
 * cartão — o método exato oferecido no checkout é definido pela conta
 * InfinitePay do casal, não por este endpoint.
 *
 * Sem token de convite (CLAUDE.md, seção 18.2/4.5) — o presente é público, a
 * identificação de quem paga é só giverName/giverPhone, coletados no modal.
 * `wedding_id` vem do próprio `gift_id`, que já o determina unicamente.
 */
export default defineEventHandler(async (event) => {
  const giftId = getRouterParam(event, 'id')
  if (!giftId) {
    throw badRequestError('id do presente não informado.')
  }
  const input = await validateBody(event, giftCheckoutSchema)

  const client = supabaseAdmin(event)

  const { data: gift, error: giftError } = await client
    .from('gifts')
    .select('id, wedding_id, title, is_group_gift, price_cents, quantity_available, quota_amount_cents')
    .eq('id', giftId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (giftError) {
    throw badRequestError(giftError.message)
  }
  if (!gift) {
    throw notFoundError('Presente não encontrado.')
  }

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('slug, infinitepay_handle')
    .eq('id', gift.wedding_id)
    .single()
  if (weddingError) {
    throw badRequestError(weddingError.message)
  }
  if (!wedding.infinitepay_handle) {
    throw badRequestError('Pagamento online não está disponível para este casamento.')
  }

  const kind: 'reservation' | 'contribution' = gift.is_group_gift ? 'contribution' : 'reservation'
  let amountCents: number
  let quotaCount: number | null = null

  if (kind === 'reservation') {
    if (gift.price_cents === null) {
      throw badRequestError('Este presente não tem preço definido para pagamento online.')
    }
    // Checagem best-effort — a garantia real contra corrida é a RPC
    // reserve_gift(), chamada só depois do pagamento confirmado.
    if ((gift.quantity_available ?? 0) <= 0) {
      throw conflictError('Este presente já foi totalmente reservado.')
    }
    amountCents = gift.price_cents
  } else if (gift.quota_amount_cents) {
    if (!input.quotaCount) {
      throw badRequestError('Informe a quantidade de cotas.')
    }
    quotaCount = input.quotaCount
    amountCents = input.quotaCount * gift.quota_amount_cents
  } else {
    if (!input.amountCents) {
      throw badRequestError('Informe o valor da contribuição.')
    }
    amountCents = input.amountCents
  }

  const paymentId = randomUUID()
  const siteUrl = useRuntimeConfig().siteUrl as string
  const redirectUrl = `${siteUrl}/${wedding.slug}/presentes/pagamento/${paymentId}`
  const webhookUrl = `${siteUrl}/api/public/gifts/payments/webhook`

  const checkout = await createInfinitePayCheckoutLink({
    handle: wedding.infinitepay_handle,
    redirectUrl,
    webhookUrl,
    orderNsu: paymentId,
    items: [{ quantity: 1, price: amountCents, description: gift.title }],
  })

  if (!checkout.ok) {
    throw createError({ statusCode: 502, message: 'Não foi possível iniciar o pagamento. Tente novamente.' })
  }

  const { error: insertError } = await client.from('gift_payments').insert({
    id: paymentId,
    wedding_id: gift.wedding_id,
    gift_id: giftId,
    invite_id: null,
    kind,
    quota_count: quotaCount,
    amount_cents: amountCents,
    guest_message: input.message || null,
    giver_name: input.giverName,
    giver_phone: input.giverPhone || null,
    status: 'pending',
    provider_order_nsu: paymentId,
    provider_checkout_url: checkout.checkoutUrl,
  })

  if (insertError) {
    throw badRequestError(insertError.message)
  }

  return { checkoutUrl: checkout.checkoutUrl, paymentId }
})
