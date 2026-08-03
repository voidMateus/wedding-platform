import type { Wedding } from '~/types/wedding'

/**
 * Dados públicos do casamento (home pública, CLAUDE.md seção 1/26/33). Sem
 * autenticação — usado pela home (SSR) para SEO e conteúdo inicial.
 * Resolvido pelo slug da rota atual (`/{slug}`) — cada casamento tem sua
 * própria URL.
 */
export function usePublicWedding() {
  function getPublicWedding() {
    const slug = useWeddingSlug()
    return useFetch<Wedding>(`/api/public/${slug}/wedding`, { key: `public-wedding-${slug}` })
  }

  return { getPublicWedding }
}
