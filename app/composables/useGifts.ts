import type { GiftInput } from '#shared/schemas/gifts'
import type { Gift } from '~/types/gift'

interface GiftListResponse {
  data: Gift[]
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
