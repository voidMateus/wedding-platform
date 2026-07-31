import type { GiftReservationsView } from '~/types/gift-public'

/** Visão administrativa de quem reservou/contribuiu (CLAUDE.md, seção 18.3/19.2). */
export function useGiftReservations() {
  async function getGiftReservations(giftId: string): Promise<GiftReservationsView> {
    return $fetch<GiftReservationsView>(`/api/gifts/${giftId}/reservations`)
  }

  return { getGiftReservations }
}
