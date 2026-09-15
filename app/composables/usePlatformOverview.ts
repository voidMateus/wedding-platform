import type {
  PlatformMemberInput,
  PlatformWeddingCreateInput,
  PlatformWeddingPatchInput,
} from '#shared/schemas/platform-wedding'
import type {
  PlatformStorageTotals,
  PlatformWeddingDetail,
  PlatformWeddingOverview,
} from '~/types/platform'

/**
 * A mesa de trabalho da equipe da plataforma (docs/PLANO-SAAS.md, Passo 8;
 * docs/fase5-multievento.md seção 6) -- único consumidor de
 * `/api/platform/**`.
 *
 * A chave NÃO carrega slug de casamento, e é a única do painel assim: esta
 * visão é deliberadamente cross-tenant (CLAUDE.md 4.2, 5º modelo de
 * confiança), e escopá-la a um casamento seria o oposto do que a tela faz.
 */
export function usePlatformOverview() {
  function getOverview() {
    return useFetch<{ data: PlatformWeddingOverview[]; totais: PlatformStorageTotals }>(
      '/api/platform/overview',
      {
        key: 'platform-overview',
      },
    )
  }

  /** Cria casamento + dono numa transação (POST /api/platform/weddings). */
  async function createWedding(input: PlatformWeddingCreateInput) {
    return $fetch('/api/platform/weddings', { method: 'POST', body: input })
  }

  /** A ficha de um casamento — rota própria, como a ficha do gasto. */
  function getWedding(id: MaybeRefOrGetter<string>) {
    return useFetch<{ data: PlatformWeddingDetail }>(
      () => `/api/platform/weddings/${toValue(id)}`,
      { key: () => `platform-wedding-${toValue(id)}` },
    )
  }

  async function updateWedding(id: string, input: PlatformWeddingPatchInput) {
    return $fetch(`/api/platform/weddings/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteWedding(id: string) {
    return $fetch(`/api/platform/weddings/${id}`, { method: 'DELETE' })
  }

  async function addMember(id: string, input: PlatformMemberInput) {
    return $fetch(`/api/platform/weddings/${id}/members`, { method: 'POST', body: input })
  }

  async function removeMember(id: string, memberId: string) {
    return $fetch(`/api/platform/weddings/${id}/members/${memberId}`, { method: 'DELETE' })
  }

  return {
    getOverview,
    createWedding,
    getWedding,
    updateWedding,
    deleteWedding,
    addMember,
    removeMember,
  }
}
