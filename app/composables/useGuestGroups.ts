import type { GuestGroupInput } from '#shared/schemas/guest-groups'
import type { GuestGroup } from '~/types/guest-group'

interface GuestGroupListResponse {
  data: GuestGroup[]
  meta: { page: number; pageSize: number; total: number }
}

interface DeleteGuestGroupResult {
  id: string
  guestsSoftDeleted: number
}

/**
 * CRUD de guest_groups (CLAUDE.md, seção 17). Toda chamada de rede do client
 * passa por aqui, nunca direto em página/componente (CLAUDE.md, seção 5.1).
 */
export function useGuestGroups() {
  function listGuestGroups(params?: { page?: number; pageSize?: number }) {
    return useFetch<GuestGroupListResponse>('/api/guest-groups', {
      query: params,
      key: 'guest-groups',
    })
  }

  async function createGuestGroup(input: GuestGroupInput): Promise<GuestGroup> {
    return $fetch<GuestGroup>('/api/guest-groups', { method: 'POST', body: input })
  }

  async function updateGuestGroup(id: string, input: GuestGroupInput): Promise<GuestGroup> {
    return $fetch<GuestGroup>(`/api/guest-groups/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteGuestGroup(
    id: string,
    options?: { cascade?: boolean },
  ): Promise<DeleteGuestGroupResult> {
    return $fetch<DeleteGuestGroupResult>(`/api/guest-groups/${id}`, {
      method: 'DELETE',
      query: options?.cascade ? { cascade: 'true' } : undefined,
    })
  }

  return { listGuestGroups, createGuestGroup, updateGuestGroup, deleteGuestGroup }
}
