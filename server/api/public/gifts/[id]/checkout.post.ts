import { randomUUID } from 'node:crypto'
import { giftCheckoutSchema } from '#shared/schemas/gift-payments'

/**
 * Cria uma tentativa de pagamento online via InfinitePay (CLAUDE.md, seção
 * 18/28) — presente físico pago (tipo='reserva') ou contribuição em
 * dinheiro (tipo='contribuicao', valor livre ou cotas fixas). O valor
 * cobrado é SEMPRE calculado aqui no servidor a partir do próprio
 * `presente`, nunca aceito do client, exceto na contribuição de valor
 * livre. Não efetiva nenhuma reserva/contribuição — isso só acontece em
 * confirmar_pagamento_presente(), depois de o pagamento ser confirmado
 * (webhook ou status.get.ts). Pix e/ou cartão — o método exato oferecido no
 * checkout é definido pela conta InfinitePay do casal, não por este
 * endpoint.
 *
 * Sem token de convite (CLAUDE.md, seção 18.2/4.5) — o presente é público, a
 * identificação de quem paga é só nomePresenteador/telefonePresenteador,
 * coletados no modal. `casamento_id` vem do próprio `presente_id`, que já o
 * determina unicamente.
 */
export default defineEventHandler(async (event) => {
  const giftId = getRouterParam(event, 'id')
  if (!giftId) {
    throw badRequestError('id do presente não informado.')
  }
  const input = await validateBody(event, giftCheckoutSchema)

  const client = supabaseAdmin(event)

  const { data: gift, error: giftError } = await client
    .from('presentes')
    .select('id, casamento_id, titulo, e_presente_cota, preco_centavos, quantidade_disponivel, valor_cota_centavos')
    .eq('id', giftId)
    .eq('esta_ativo', true)
    .is('excluido_em', null)
    .maybeSingle()
  if (giftError) {
    throw badRequestError(giftError.message)
  }
  if (!gift) {
    throw notFoundError('Presente não encontrado.')
  }

  const { data: wedding, error: weddingError } = await client
    .from('casamentos')
    .select('slug, handle_infinitepay, modo_entrega_presente_fisico')
    .eq('id', gift.casamento_id)
    .single()
  if (weddingError) {
    throw badRequestError(weddingError.message)
  }
  if (!wedding.handle_infinitepay) {
    throw badRequestError('Pagamento online não está disponível para este casamento.')
  }

  const kind: 'reserva' | 'contribuicao' = gift.e_presente_cota ? 'contribuicao' : 'reserva'
  let amountCents: number
  let quotaCount: number | null = null

  if (kind === 'reserva') {
    // Modo de entrega (CLAUDE.md, seção 18.2) — reforçado aqui pra uma
    // chamada direta a este endpoint não contornar 'somente_compra_propria'
    // (achado de segurança, varredura de 2026-08-19). Não se aplica a
    // contribuições/cotas, que sempre exigem pagamento online.
    if (wedding.modo_entrega_presente_fisico === 'somente_compra_propria') {
      throw badRequestError('Pagamento online não está disponível para este presente.')
    }
    if (gift.preco_centavos === null) {
      throw badRequestError('Este presente não tem preço definido para pagamento online.')
    }
    // Checagem best-effort — a garantia real contra corrida é a RPC
    // reservar_presente(), chamada só depois do pagamento confirmado.
    if ((gift.quantidade_disponivel ?? 0) <= 0) {
      throw conflictError('Este presente já foi totalmente reservado.')
    }
    amountCents = gift.preco_centavos
  } else if (gift.valor_cota_centavos) {
    if (!input.quantidadeCotas) {
      throw badRequestError('Informe a quantidade de cotas.')
    }
    quotaCount = input.quantidadeCotas
    amountCents = input.quantidadeCotas * gift.valor_cota_centavos
  } else {
    if (!input.valorCentavos) {
      throw badRequestError('Informe o valor da contribuição.')
    }
    amountCents = input.valorCentavos
  }

  const paymentId = randomUUID()
  const siteUrl = useRuntimeConfig().siteUrl as string
  const redirectUrl = `${siteUrl}/${wedding.slug}/presentes/pagamento/${paymentId}`
  const webhookUrl = `${siteUrl}/api/public/gifts/payments/webhook`

  const checkout = await createInfinitePayCheckoutLink({
    handle: wedding.handle_infinitepay,
    redirectUrl,
    webhookUrl,
    orderNsu: paymentId,
    items: [{ quantity: 1, price: amountCents, description: gift.titulo }],
  })

  if (!checkout.ok) {
    throw createError({ statusCode: 502, message: 'Não foi possível iniciar o pagamento. Tente novamente.' })
  }

  const { error: insertError } = await client.from('pagamentos_presentes').insert({
    id: paymentId,
    casamento_id: gift.casamento_id,
    presente_id: giftId,
    convite_id: null,
    tipo: kind,
    quantidade_cotas: quotaCount,
    valor_centavos: amountCents,
    mensagem_convidado: input.message || null,
    nome_presenteador: input.nomePresenteador,
    telefone_presenteador: input.telefonePresenteador || null,
    status_pagamento: 'pendente',
    nsu_pedido_provedor: paymentId,
    url_checkout_provedor: checkout.checkoutUrl,
  })

  if (insertError) {
    throw badRequestError(insertError.message)
  }

  return { checkoutUrl: checkout.checkoutUrl, paymentId }
})
