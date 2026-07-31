import type { EventSegment } from '~/types/event-segment'

interface EventSegmentListResponse {
  data: EventSegment[]
}

/**
 * Cronograma público (seções em destaque da home, CLAUDE.md seção 1/26).
 * Sem autenticação — mesma tabela do painel administrativo, exposta em
 * somente leitura.
 */
export function usePublicEventSegments() {
  function getPublicEventSegments() {
    return useFetch<EventSegmentListResponse>('/api/public/event-segments', {
      key: 'public-event-segments',
    })
  }

  return { getPublicEventSegments }
}
