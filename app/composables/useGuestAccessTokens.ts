import type { GuestAccessTokenGenerateInput } from '#shared/schemas/guest-access-tokens'
import type { GuestAccessTokenGenerated, GuestAccessTokenStatus } from '~/types/guest-access-token'

/**
 * Geração/consulta/revogação de tokens de acesso do convidado (CLAUDE.md,
 * seção 14.5/19.2). Toda chamada de rede do client passa por aqui (CLAUDE.md,
 * seção 5.1).
 */
export function useGuestAccessTokens() {
  // Ação sob demanda (disparada por clique, não no load da página) — $fetch
  // direto, como as demais mutações dos composables administrativos.
  async function getStatus(
    query: GuestAccessTokenGenerateInput,
  ): Promise<GuestAccessTokenStatus> {
    return $fetch<GuestAccessTokenStatus>('/api/guest-access-tokens', { query })
  }

  async function generate(
    input: GuestAccessTokenGenerateInput,
  ): Promise<GuestAccessTokenGenerated> {
    return $fetch<GuestAccessTokenGenerated>('/api/guest-access-tokens', {
      method: 'POST',
      body: input,
    })
  }

  async function revoke(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/guest-access-tokens/${id}/revoke`, { method: 'POST' })
  }

  return { getStatus, generate, revoke }
}
