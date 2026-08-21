import { describe, expect, it } from 'vitest'
import { resolveEventSegmentVenue } from '~/utils/resolve-event-segment-venue'
import type { EventSegment } from '~/types/event-segment'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    wedding_id: '11111111-1111-1111-1111-111111111111',
    title: 'Cerimônia',
    venue_name: 'Igreja São José',
    venue_address: 'Rua das Flores, 100',
    venue_latitude: -15.6,
    venue_longitude: -56.1,
    same_venue_as: null,
    image_url: null,
    starts_at: null,
    ends_at: null,
    display_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('resolveEventSegmentVenue', () => {
  it('retorna o segmento sem alterações quando same_venue_as não está definido', () => {
    const segment = makeSegment()
    expect(resolveEventSegmentVenue(segment, [segment])).toBe(segment)
  })

  it('substitui os campos de local pelos do segmento referenciado', () => {
    const source = makeSegment({ id: 'source', title: 'Cerimônia' })
    const dependent = makeSegment({
      id: 'dependent',
      title: 'Recepção',
      same_venue_as: 'source',
      venue_name: null,
      venue_address: null,
      venue_latitude: null,
      venue_longitude: null,
    })

    const resolved = resolveEventSegmentVenue(dependent, [source, dependent])

    expect(resolved.venue_name).toBe(source.venue_name)
    expect(resolved.venue_address).toBe(source.venue_address)
    expect(resolved.venue_latitude).toBe(source.venue_latitude)
    expect(resolved.venue_longitude).toBe(source.venue_longitude)
    expect(resolved.title).toBe('Recepção') // mantém os próprios dados que não são de local
  })

  it('retorna o segmento original quando o segmento referenciado não é encontrado na lista', () => {
    const segment = makeSegment({ same_venue_as: 'não-existe' })
    expect(resolveEventSegmentVenue(segment, [segment])).toBe(segment)
  })
})
