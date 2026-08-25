import type { PlatformWeddingOverview } from '~/types/platform'

/**
 * Visão mínima entre tenants pra equipe da plataforma (docs/PLANO-SAAS.md,
 * Passo 8) -- único consumidor de GET /api/platform/overview.
 */
export function usePlatformOverview() {
  function getOverview() {
    return useFetch<{ data: PlatformWeddingOverview[] }>('/api/platform/overview', { key: 'platform-overview' })
  }

  return { getOverview }
}
