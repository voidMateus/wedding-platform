import type { InviteTagInput } from '#shared/schemas/invites'
import type { InviteTag } from '~/types/invite'

/** CRUD de invite_tags — etiquetas internas reutilizáveis de convite (CLAUDE.md, seção 12.1). */
export function useInviteTags() {
  function listInviteTags() {
    return useFetch<{ data: InviteTag[] }>('/api/invite-tags', { key: 'invite-tags' })
  }

  async function createInviteTag(input: InviteTagInput): Promise<InviteTag> {
    return $fetch<InviteTag>('/api/invite-tags', { method: 'POST', body: input })
  }

  async function deleteInviteTag(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/invite-tags/${id}`, { method: 'DELETE' })
  }

  return { listInviteTags, createInviteTag, deleteInviteTag }
}
