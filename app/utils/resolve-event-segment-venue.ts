import type { EventSegment } from '~/types/event-segment'

/**
 * Resolve o local "efetivo" de um segmento do cronograma (CLAUDE.md, 12.2 —
 * cerimônia e recepção no mesmo local). Quando `same_venue_as` aponta para
 * outro segmento já presente na mesma lista buscada, retorna uma cópia com
 * os campos de local substituídos pelos do segmento referenciado — os
 * componentes de exibição (EventSpotlight.vue) continuam lendo
 * venue_name/venue_address/venue_latitude/venue_longitude normalmente, sem
 * precisar conhecer o mecanismo de referência.
 */
export function resolveEventSegmentVenue(
  segment: EventSegment,
  allSegments: EventSegment[],
): EventSegment {
  if (!segment.same_venue_as) return segment

  const source = allSegments.find((candidate) => candidate.id === segment.same_venue_as)
  if (!source) return segment

  return {
    ...segment,
    venue_name: source.venue_name,
    venue_address: source.venue_address,
    venue_latitude: source.venue_latitude,
    venue_longitude: source.venue_longitude,
  }
}
