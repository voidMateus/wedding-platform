export interface PublicGift {
  id: string
  title: string
  description: string | null
  priceCents: number | null
  imageUrl: string | null
  categoryId: string | null
  isGroupGift: boolean
  quantityAvailable: number | null
  targetAmountCents: number | null
  collectedAmountCents: number | null
  reservedByMe: boolean
  contributedByMeCents: number | null
}

export interface GiftReservationEntry {
  id: string
  name: string
  reservedAt: string
}

export interface GiftContributionEntry {
  id: string
  name: string
  amountCents: number
  contributedAt: string
}

export interface GiftReservationsView {
  reservations: GiftReservationEntry[]
  contributions: GiftContributionEntry[]
}
