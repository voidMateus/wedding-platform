import type { PlatformWeddingCreateInput } from '#shared/schemas/platform-wedding'
import type { PlatformStorageTotals, PlatformWeddingOverview } from '~/types/platform'

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

  return { getOverview, createWedding }
}
