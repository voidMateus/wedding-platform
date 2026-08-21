import type { EventSegment } from '~/types/event-segment'

/**
 * Agrupa segmentos que compartilham local via `mesmo_local_que` (CLAUDE.md,
 * §12.2) — quando um segmento aponta para outro presente na lista, vira um
 * "momento" dentro do grupo do segmento referenciado (primeiro item do
 * grupo) em vez de gerar seu próprio card duplicando endereço/mapa.
 */
export function groupEventSegmentsByVenue(segments: EventSegment[]): EventSegment[][] {
  const idSet = new Set(segments.map((s) => s.id))
  const dependentsByTarget = new Map<string, EventSegment[]>()
  const standalone: EventSegment[] = []

  for (const segment of segments) {
    if (segment.mesmo_local_que && idSet.has(segment.mesmo_local_que)) {
      const list = dependentsByTarget.get(segment.mesmo_local_que) ?? []
      list.push(segment)
      dependentsByTarget.set(segment.mesmo_local_que, list)
    } else {
      standalone.push(segment)
    }
  }

  return standalone.map((primary) => [primary, ...(dependentsByTarget.get(primary.id) ?? [])])
}
