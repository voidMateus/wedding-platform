import type { GuestInput } from '#shared/schemas/guests'
import type { Guest } from '~/types/guest'

interface GuestListResponse {
  data: Guest[]
  meta: { page: number; pageSize: number; total: number }
}

interface GuestListParams {
  page?: number
  pageSize?: number
  search?: string
  groupId?: string
}

/**
 * CRUD de guests (CLAUDE.md, seção 15). Toda chamada de rede do client passa
 * por aqui, nunca direto em página/componente (CLAUDE.md, seção 5.1).
 */
export function useGuests() {
  function listGuests(params?: MaybeRefOrGetter<GuestListParams | undefined>) {
    // useFetch já reage a mudanças em `query` quando ele é um ref/computed —
    // não precisa de `watch` explícito além disso.
    return useFetch<GuestListResponse>('/api/guests', {
      query: params,
      key: 'guests',
    })
  }

  async function createGuest(input: GuestInput): Promise<Guest> {
    return $fetch<Guest>('/api/guests', { method: 'POST', body: input })
  }

  async function updateGuest(id: string, input: GuestInput): Promise<Guest> {
    return $fetch<Guest>(`/api/guests/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteGuest(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/guests/${id}`, { method: 'DELETE' })
  }

  return { listGuests, createGuest, updateGuest, deleteGuest }
}
