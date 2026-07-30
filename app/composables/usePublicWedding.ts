import type { Wedding } from '~/types/wedding'

/**
 * Dados públicos do casamento (home pública, CLAUDE.md seção 1/26). Sem
 * autenticação — usado pela home (SSR) para SEO e conteúdo inicial.
 */
export function usePublicWedding() {
  function getPublicWedding() {
    return useFetch<Wedding>('/api/public/wedding', { key: 'public-wedding' })
  }

  return { getPublicWedding }
}
