import type { EventSegment } from '~/types/event-segment'

/**
 * Resolve o local "efetivo" de um segmento do cronograma (CLAUDE.md, 12.2 —
 * cerimônia e recepção no mesmo local). Quando `mesmo_local_que` aponta para
 * outro segmento já presente na mesma lista buscada, retorna uma cópia com
 * os campos de local substituídos pelos do segmento referenciado — os
 * componentes de exibição (EventSpotlight.vue) continuam lendo
 * nome_local/endereco_local/latitude_local/longitude_local normalmente, sem
 * precisar conhecer o mecanismo de referência.
 */
export function resolveEventSegmentVenue(
  segment: EventSegment,
  allSegments: EventSegment[],
): EventSegment {
  if (!segment.mesmo_local_que) return segment

  const source = allSegments.find((candidate) => candidate.id === segment.mesmo_local_que)
  if (!source) return segment

  return {
    ...segment,
    nome_local: source.nome_local,
    endereco_local: source.endereco_local,
    latitude_local: source.latitude_local,
    longitude_local: source.longitude_local,
  }
}
