import { describe, expect, it } from 'vitest'
import { EVENT_SEGMENT_ICONS, classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'

describe('classifyEventSegmentTitle', () => {
  it('classifica títulos de cerimônia (com e sem acento)', () => {
    expect(classifyEventSegmentTitle('Cerimônia')).toBe('ceremony')
    expect(classifyEventSegmentTitle('cerimonia religiosa')).toBe('ceremony')
  })

  it('classifica títulos de recepção (com e sem acento)', () => {
    expect(classifyEventSegmentTitle('Recepção')).toBe('reception')
    expect(classifyEventSegmentTitle('recepcao no jardim')).toBe('reception')
  })

  it('classifica títulos de festa', () => {
    expect(classifyEventSegmentTitle('Festa')).toBe('party')
  })

  it('cai em "other" para títulos livres sem palavra-chave', () => {
    expect(classifyEventSegmentTitle('Chá de panela')).toBe('other')
  })

  it('EVENT_SEGMENT_ICONS cobre todas as categorias', () => {
    expect(EVENT_SEGMENT_ICONS.ceremony).toBe('lucide:church')
    expect(EVENT_SEGMENT_ICONS.reception).toBe('lucide:glass-water')
    expect(EVENT_SEGMENT_ICONS.party).toBe('lucide:party-popper')
    expect(EVENT_SEGMENT_ICONS.other).toBe('lucide:calendar')
  })
})
