// event_segments não tem uma coluna de tipo estruturada (CLAUDE.md, seção
// 12) — a classificação abaixo é só um indício visual por palavra-chave no
// título, nunca uma classificação de negócio. Compartilhado entre
// Timeline.vue (ícone por segmento) e EventSpotlight.vue (Fase Editorial —
// encontrar o segmento de Cerimônia/Recepção para destacar), para não
// duplicar a mesma heurística em dois lugares.

export type EventSegmentKind = 'ceremony' | 'reception' | 'party' | 'other'

const CEREMONY_KEYWORDS = ['cerimônia', 'cerimonia']
const RECEPTION_KEYWORDS = ['recepção', 'recepcao']
const PARTY_KEYWORDS = ['festa']

export function classifyEventSegmentTitle(title: string): EventSegmentKind {
  const normalized = title.toLowerCase()
  if (CEREMONY_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'ceremony'
  if (RECEPTION_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'reception'
  if (PARTY_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'party'
  return 'other'
}

export const EVENT_SEGMENT_ICONS: Record<EventSegmentKind, string> = {
  ceremony: 'lucide:church',
  reception: 'lucide:glass-water',
  party: 'lucide:party-popper',
  other: 'lucide:calendar',
}
