import type { GuestPartyReorderInput, GuestPartySyncInput } from '#shared/schemas/guests'
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
  unassigned?: boolean
}

export interface GuestDetail extends Guest {
  partyMembers: Guest[]
  invite: { id: string; name: string } | null
}

interface GuestPartySyncResult {
  primaryGuestId: string
  partyId: string | null
  inviteId: string | null
}

/**
 * CRUD de guests (CLAUDE.md, seção 15). Toda chamada de rede do client
 * passa por aqui, nunca direto em página/componente (CLAUDE.md, seção 5.1).
 */
export function useGuests() {
  function listGuests(params?: MaybeRefOrGetter<GuestListParams | undefined>) {
    return useFetch<GuestListResponse>('/api/guests', { query: params, key: 'guests' })
  }

  function getGuest(id: MaybeRefOrGetter<string>) {
    return useFetch<GuestDetail>(() => `/api/guests/${toValue(id)}`, {
      key: () => `guest-${toValue(id)}`,
    })
  }

  async function syncGuestParty(input: GuestPartySyncInput): Promise<GuestPartySyncResult> {
    return $fetch<GuestPartySyncResult>('/api/guests/party', { method: 'PUT', body: input })
  }

  async function reorderGuestParty(input: GuestPartyReorderInput) {
    return $fetch('/api/guests/party/reorder', { method: 'PATCH', body: input })
  }

  async function deleteGuest(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/guests/${id}`, { method: 'DELETE' })
  }

  return { listGuests, getGuest, syncGuestParty, reorderGuestParty, deleteGuest }
}
