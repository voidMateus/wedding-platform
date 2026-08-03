import type { EventSegment } from '~/types/event-segment'

interface EventSegmentListResponse {
  data: EventSegment[]
}

/**
 * Cronograma público (seções em destaque da home, CLAUDE.md seção 1/26).
 * Sem autenticação — mesma tabela do painel administrativo, exposta em
 * somente leitura. Resolvido pelo slug da rota atual (`/{slug}`).
 */
export function usePublicEventSegments() {
  function getPublicEventSegments() {
    const slug = useWeddingSlug()
    return useFetch<EventSegmentListResponse>(`/api/public/${slug}/event-segments`, {
      key: `public-event-segments-${slug}`,
    })
  }

  return { getPublicEventSegments }
}
