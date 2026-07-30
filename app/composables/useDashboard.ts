import type { DashboardSummary } from '~/types/dashboard'

/**
 * Contadores essenciais do painel administrativo (CLAUDE.md, seção 19.2).
 */
export function useDashboard() {
  function getSummary() {
    return useFetch<DashboardSummary>('/api/dashboard/summary', { key: 'dashboard-summary' })
  }

  return { getSummary }
}
