import { describe, expect, it } from 'vitest'
import { groupEventSegmentsByVenue } from '~/utils/group-event-segments-by-venue'
import type { EventSegment } from '~/types/event-segment'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    wedding_id: '11111111-1111-1111-1111-111111111111',
    title: 'Cerimônia',
    venue_name: 'Igreja São José',
    venue_address: 'Rua das Flores, 100',
    venue_latitude: null,
    venue_longitude: null,
    same_venue_as: null,
    starts_at: null,
    ends_at: null,
    display_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('groupEventSegmentsByVenue', () => {
  it('cada segmento sem same_venue_as vira seu próprio grupo', () => {
    const ceremony = makeSegment({ id: 'a' })
    const reception = makeSegment({ id: 'b', title: 'Recepção' })
    expect(groupEventSegmentsByVenue([ceremony, reception])).toEqual([[ceremony], [reception]])
  })

  it('funde um dependente no grupo do segmento referenciado', () => {
    const ceremony = makeSegment({ id: 'a' })
    const reception = makeSegment({ id: 'b', title: 'Recepção', same_venue_as: 'a' })
    expect(groupEventSegmentsByVenue([ceremony, reception])).toEqual([[ceremony, reception]])
  })

  it('trata o segmento como próprio grupo quando same_venue_as aponta pra id ausente', () => {
    const orphan = makeSegment({ same_venue_as: 'não-existe' })
    expect(groupEventSegmentsByVenue([orphan])).toEqual([[orphan]])
  })
})
