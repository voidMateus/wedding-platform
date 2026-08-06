import type { GiftInput } from '#shared/schemas/gifts'
import type { Gift } from '~/types/gift'

export interface GiftPaymentsSummary {
  confirmedTotalCents: number
  failedCount: number
}

export interface GiftActivityEntry {
  id: string
  type: 'reservation' | 'contribution'
  giftId: string
  giftTitle: string
  name: string
  phone: string | null
  amountCents: number | null
  quotaCount: number | null
  message: string | null
  isPaid: boolean
  at: string
}

interface GiftListResponse {
  data: Gift[]
  paymentsSummary: GiftPaymentsSummary
  activity: GiftActivityEntry[]
}

/**
 * CRUD de presentes (CLAUDE.md, seção 18/19.2). Toda chamada de rede do
 * client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useGifts() {
  function listGifts() {
    return useFetch<GiftListResponse>('/api/gifts', { key: 'gifts' })
  }

  async function createGift(input: GiftInput): Promise<Gift> {
    return $fetch<Gift>('/api/gifts', { method: 'POST', body: input })
  }

  async function updateGift(id: string, input: GiftInput): Promise<Gift> {
    return $fetch<Gift>(`/api/gifts/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteGift(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/gifts/${id}`, { method: 'DELETE' })
  }

  return { listGifts, createGift, updateGift, deleteGift }
}
