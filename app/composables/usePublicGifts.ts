import type { PublicGift } from '~/types/gift-public'

interface PublicGiftListResponse {
  data: PublicGift[]
}

interface GiftCheckoutResponse {
  checkoutUrl: string
  paymentId: string
}

export interface GiftPaymentStatus {
  status: 'pendente' | 'confirmado' | 'falhou' | 'expirado'
  giftTitle: string | null
  amountCents: number
  quotaCount: number | null
  confirmedAt: string | null
}

/**
 * Vitrine pública de presentes (CLAUDE.md, seção 18.2) — sem token de
 * convite: a página é pública, sem link personalizado. Identificação de
 * quem presenteia é só nome/telefone (ver useGiftGiverIdentity), coletados
 * no modal antes de reservar/pagar. Resolvido pelo slug da rota atual
 * (`/{slug}`); mutações resolvem o wedding pelo próprio `giftId`.
 */
export function usePublicGifts() {
  function getPublicGifts() {
    const slug = useWeddingSlug()
    return useFetch<PublicGiftListResponse>(`/api/public/${slug}/gifts`, {
      key: `public-gifts-${slug}`,
    })
  }

  async function reserveGift(
    giftId: string,
    giver: { name: string; phone?: string },
    message?: string,
  ): Promise<unknown> {
    return $fetch(`/api/public/gifts/${giftId}/reserve`, {
      method: 'POST',
      body: { nomePresenteador: giver.name, telefonePresenteador: giver.phone, message },
    })
  }

  /** Cria uma tentativa de pagamento online via InfinitePay (reserva paga ou contribuição) — devolve a URL de checkout hospedado, pra onde o browser deve navegar. */
  async function createCheckout(
    giftId: string,
    giver: { name: string; phone?: string },
    options: { message?: string; amountCents?: number; quotaCount?: number },
  ): Promise<GiftCheckoutResponse> {
    return $fetch<GiftCheckoutResponse>(`/api/public/gifts/${giftId}/checkout`, {
      method: 'POST',
      body: {
        nomePresenteador: giver.name,
        telefonePresenteador: giver.phone,
        message: options.message,
        valorCentavos: options.amountCents,
        quantidadeCotas: options.quotaCount,
      },
    })
  }

  async function getPaymentStatus(
    paymentId: string,
    hints?: { transactionNsu?: string; slug?: string },
  ): Promise<GiftPaymentStatus> {
    return $fetch<GiftPaymentStatus>(`/api/public/gifts/payments/${paymentId}/status`, {
      query: { nsuTransacao: hints?.transactionNsu, slug: hints?.slug },
    })
  }

  return { getPublicGifts, reserveGift, createCheckout, getPaymentStatus }
}
