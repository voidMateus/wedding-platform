import type { InviteInput } from '#shared/schemas/invites'
import type { Invite, InviteDetail, InviteEvent, InviteListItem } from '~/types/invite'

interface InviteListResponse {
  data: InviteListItem[]
  meta: { page: number; pageSize: number; total: number }
}

interface InviteListParams {
  page?: number
  pageSize?: number
  search?: string
  includeArchived?: boolean
}

/**
 * CRUD de invites (CLAUDE.md, seção 12.1/19.2). Toda chamada de rede do
 * client passa por aqui, nunca direto em página/componente (CLAUDE.md,
 * seção 5.1).
 */
export function useInvites() {
  function listInvites(params?: MaybeRefOrGetter<InviteListParams | undefined>) {
    return useFetch<InviteListResponse>('/api/invites', { query: params, key: 'invites' })
  }

  function getInvite(id: MaybeRefOrGetter<string>) {
    return useFetch<InviteDetail>(() => `/api/invites/${toValue(id)}`, {
      key: () => `invite-${toValue(id)}`,
    })
  }

  async function createInvite(input: InviteInput): Promise<Invite> {
    return $fetch<Invite>('/api/invites', { method: 'POST', body: input })
  }

  async function updateInvite(id: string, input: InviteInput): Promise<Invite> {
    return $fetch<Invite>(`/api/invites/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteInvite(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/invites/${id}`, { method: 'DELETE' })
  }

  async function addGuestsToInvite(id: string, guestIds: string[]) {
    return $fetch<{ id: string; addedGuestIds: string[] }>(`/api/invites/${id}/guests`, {
      method: 'POST',
      body: { guestIds },
    })
  }

  async function removeGuestFromInvite(id: string, guestId: string) {
    return $fetch<{ id: string }>(`/api/invites/${id}/guests/${guestId}`, { method: 'DELETE' })
  }

  async function markInviteSent(id: string): Promise<Invite> {
    return $fetch<Invite>(`/api/invites/${id}/send`, { method: 'POST' })
  }

  async function setInviteArchived(id: string, archived: boolean): Promise<Invite> {
    return $fetch<Invite>(`/api/invites/${id}/archive`, { method: 'POST', body: { archived } })
  }

  function getInviteTimeline(id: MaybeRefOrGetter<string>) {
    return useFetch<{ data: InviteEvent[] }>(() => `/api/invites/${toValue(id)}/timeline`, {
      key: () => `invite-timeline-${toValue(id)}`,
    })
  }

  return {
    listInvites,
    getInvite,
    createInvite,
    updateInvite,
    deleteInvite,
    addGuestsToInvite,
    removeGuestFromInvite,
    markInviteSent,
    setInviteArchived,
    getInviteTimeline,
  }
}
