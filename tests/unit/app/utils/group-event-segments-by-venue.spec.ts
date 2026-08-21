import { describe, expect, it } from 'vitest'
import { groupEventSegmentsByVenue } from '~/utils/group-event-segments-by-venue'
import type { EventSegment } from '~/types/event-segment'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    casamento_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Cerimônia',
    nome_local: 'Igreja São José',
    endereco_local: 'Rua das Flores, 100',
    latitude_local: null,
    longitude_local: null,
    mesmo_local_que: null,
    url_imagem: null,
    inicia_em: null,
    termina_em: null,
    ordem_exibicao: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('groupEventSegmentsByVenue', () => {
  it('cada segmento sem mesmo_local_que vira seu próprio grupo', () => {
    const ceremony = makeSegment({ id: 'a' })
    const reception = makeSegment({ id: 'b', titulo: 'Recepção' })
    expect(groupEventSegmentsByVenue([ceremony, reception])).toEqual([[ceremony], [reception]])
  })

  it('funde um dependente no grupo do segmento referenciado', () => {
    const ceremony = makeSegment({ id: 'a' })
    const reception = makeSegment({ id: 'b', titulo: 'Recepção', mesmo_local_que: 'a' })
    expect(groupEventSegmentsByVenue([ceremony, reception])).toEqual([[ceremony, reception]])
  })

  it('trata o segmento como próprio grupo quando mesmo_local_que aponta pra id ausente', () => {
    const orphan = makeSegment({ mesmo_local_que: 'não-existe' })
    expect(groupEventSegmentsByVenue([orphan])).toEqual([[orphan]])
  })
})
