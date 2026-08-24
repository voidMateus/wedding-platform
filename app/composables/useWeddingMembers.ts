import type { WeddingMemberInviteInput } from '#shared/schemas/wedding-members'
import type { WeddingMemberEntry } from '~/types/wedding-member'

/**
 * Gestão de colaboradores do casamento ativo (docs/PLANO-SAAS.md, Passo 3) —
 * tela de "Colaboradores" em /admin/configuracoes. Toda chamada de rede do
 * client passa por aqui, nunca direto em página/componente (CLAUDE.md,
 * seção 5.1).
 */
export function useWeddingMembers() {
  function listWeddingMembers() {
    return useFetch<{ data: WeddingMemberEntry[] }>('/api/wedding/members', { key: 'wedding-members' })
  }

  async function inviteWeddingMember(input: WeddingMemberInviteInput): Promise<WeddingMemberEntry> {
    return $fetch<WeddingMemberEntry>('/api/wedding/members', { method: 'POST', body: input })
  }

  async function removeWeddingMember(id: string): Promise<{ ok: true }> {
    return $fetch<{ ok: true }>(`/api/wedding/members/${id}`, { method: 'DELETE' })
  }

  return { listWeddingMembers, inviteWeddingMember, removeWeddingMember }
}
