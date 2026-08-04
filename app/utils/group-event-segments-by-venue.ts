import type { EventSegment } from '~/types/event-segment'

/**
 * Agrupa segmentos do cronograma que compartilham o mesmo local via
 * `same_venue_as` (CLAUDE.md, §12.2). Quando um segmento aponta
 * `same_venue_as` para outro presente na mesma lista, ele deixa de virar seu
 * próprio card e passa a ser um "momento" dentro do grupo do segmento
 * referenciado (sempre o primeiro item do grupo retornado) — evita repetir o
 * mesmo endereço/mapa em duas seções (ex.: Cerimônia e Recepção no mesmo
 * endereço). Um `same_venue_as` apontando para um id ausente da lista (nunca
 * deveria acontecer, dada a validação em `validate-same-venue.ts`) faz o
 * segmento virar seu próprio grupo, em vez de desaparecer silenciosamente.
 */
export function groupEventSegmentsByVenue(segments: EventSegment[]): EventSegment[][] {
  const idSet = new Set(segments.map((segment) => segment.id))
  const dependentsByTarget = new Map<string, EventSegment[]>()
  const standalone: EventSegment[] = []

  for (const segment of segments) {
    if (segment.same_venue_as && idSet.has(segment.same_venue_as)) {
      const list = dependentsByTarget.get(segment.same_venue_as) ?? []
      list.push(segment)
      dependentsByTarget.set(segment.same_venue_as, list)
    } else {
      standalone.push(segment)
    }
  }

  return standalone.map((primary) => [primary, ...(dependentsByTarget.get(primary.id) ?? [])])
}
