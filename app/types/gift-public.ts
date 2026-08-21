export interface PublicGift {
  id: string
  title: string
  description: string | null
  priceCents: number | null
  imageUrl: string | null
  categoryId: string | null
  categoryName: string | null
  isGroupGift: boolean
  quantityAvailable: number | null
  targetAmountCents: number | null
  quotaAmountCents: number | null
  displayStyle: 'padrao' | 'emocional'
  emotionalIcon: string | null
  collectedAmountCents: number | null
  /** true quando o casal configurou handle_infinitepay (CLAUDE.md, §18/28) — controla se a opção de pagamento online (Pix e/ou cartão, conforme a conta InfinitePay do casal) aparece. */
  hasPixOption: boolean
  /** Quais formas de presentear um item físico o casal disponibiliza (CLAUDE.md, §18) — não se aplica a presentes de cota, sempre pagos online. */
  physicalDeliveryMode: 'ambos' | 'somente_compra_propria' | 'somente_pagamento'
}

export interface GiftReservationEntry {
  id: string
  name: string
  /** Nome do convite (ex.: "Família Silva") quando diferente da pessoa que presenteou — contexto adicional, nunca a identificação principal. */
  inviteName: string | null
  phone: string | null
  reservedAt: string
  message: string | null
  isPaid: boolean
}

export interface GiftContributionEntry {
  id: string
  name: string
  inviteName: string | null
  phone: string | null
  amountCents: number
  contributedAt: string
  message: string | null
  quotaCount: number | null
  isPaid: boolean
}

export interface GiftReservationsView {
  reservations: GiftReservationEntry[]
  contributions: GiftContributionEntry[]
}
