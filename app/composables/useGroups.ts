import type { GroupInput } from '#shared/schemas/groups'
import type { Group, GroupListItem } from '~/types/group'

interface GroupListResponse {
  data: GroupListItem[]
  meta: { page: number; pageSize: number; total: number }
}

/**
 * CRUD de groups — etiqueta organizacional livre (CLAUDE.md, seção 12.1).
 * Toda chamada de rede do client passa por aqui, nunca direto em
 * página/componente (CLAUDE.md, seção 5.1).
 */
export function useGroups() {
  function listGroups(params?: { page?: number; pageSize?: number; includeArchived?: boolean }) {
    return useFetch<GroupListResponse>('/api/groups', {
      query: params,
      // Chave depende de includeArchived: sem isso a tela de grupos (que pede
      // os arquivados) e as telas que só listam etiquetas ativas dividiriam o
      // mesmo cache, e os chips de convidados mostrariam grupo arquivado.
      key: params?.includeArchived ? 'groups-with-archived' : 'groups',
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

  /** Arquivar é o soft delete do grupo; `archived: false` desfaz. */
  async function setGroupArchived(id: string, archived: boolean): Promise<Group> {
    return $fetch<Group>(`/api/groups/${id}/archive`, { method: 'POST', body: { archived } })
  }

  return { listGroups, createGroup, updateGroup, deleteGroup, setGroupArchived }
}
