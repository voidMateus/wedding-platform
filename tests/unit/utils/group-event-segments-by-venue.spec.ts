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
    const ceremony = makeSegment({ id: 'a', title: 'Cerimônia' })
    const party = makeSegment({ id: 'b', title: 'Festa' })

    const groups = groupEventSegmentsByVenue([ceremony, party])

    expect(groups).toEqual([[ceremony], [party]])
  })

  it('funde um segmento dependente (same_venue_as) no grupo do segmento referenciado', () => {
    const ceremony = makeSegment({ id: 'a', title: 'Cerimônia' })
    const reception = makeSegment({ id: 'b', title: 'Recepção', same_venue_as: 'a' })

    const groups = groupEventSegmentsByVenue([ceremony, reception])

    expect(groups).toEqual([[ceremony, reception]])
  })

  it('preserva a ordem original e não duplica o dependente como grupo próprio', () => {
    const ceremony = makeSegment({ id: 'a', title: 'Cerimônia', display_order: 0 })
    const reception = makeSegment({ id: 'b', title: 'Recepção', same_venue_as: 'a', display_order: 1 })
    const party = makeSegment({ id: 'c', title: 'Festa', display_order: 2 })

    const groups = groupEventSegmentsByVenue([ceremony, reception, party])

    expect(groups).toEqual([[ceremony, reception], [party]])
  })

  it('trata o segmento como próprio grupo quando same_venue_as aponta para um id ausente', () => {
    const orphan = makeSegment({ id: 'a', title: 'Recepção', same_venue_as: 'não-existe' })

    const groups = groupEventSegmentsByVenue([orphan])

    expect(groups).toEqual([[orphan]])
  })

  it('agrupa múltiplos dependentes no mesmo segmento fonte', () => {
    const ceremony = makeSegment({ id: 'a', title: 'Cerimônia' })
    const reception = makeSegment({ id: 'b', title: 'Recepção', same_venue_as: 'a' })
    const party = makeSegment({ id: 'c', title: 'Festa', same_venue_as: 'a' })

    const groups = groupEventSegmentsByVenue([ceremony, reception, party])

    expect(groups).toEqual([[ceremony, reception, party]])
  })

  it('retorna lista vazia para lista de entrada vazia', () => {
    expect(groupEventSegmentsByVenue([])).toEqual([])
  })
})
