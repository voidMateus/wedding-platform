import type { GroupInput } from '#shared/schemas/groups'
import type { Group } from '~/types/group'

interface GroupListResponse {
  data: Group[]
  meta: { page: number; pageSize: number; total: number }
}

/**
 * CRUD de groups — etiqueta organizacional livre (CLAUDE.md, seção 12.1).
 * Toda chamada de rede do client passa por aqui, nunca direto em
 * página/componente (CLAUDE.md, seção 5.1).
 */
export function useGroups() {
  function listGroups(params?: { page?: number; pageSize?: number }) {
    return useFetch<GroupListResponse>('/api/groups', {
      query: params,
      key: 'groups',
    })
  }

  async function createGroup(input: GroupInput): Promise<Group> {
    return $fetch<Group>('/api/groups', { method: 'POST', body: input })
  }

  async function updateGroup(id: string, input: GroupInput): Promise<Group> {
    return $fetch<Group>(`/api/groups/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteGroup(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/groups/${id}`, { method: 'DELETE' })
  }

  return { listGroups, createGroup, updateGroup, deleteGroup }
}
