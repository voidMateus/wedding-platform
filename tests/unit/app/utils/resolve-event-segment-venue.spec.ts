import { describe, expect, it } from 'vitest'
import { resolveEventSegmentVenue } from '~/utils/resolve-event-segment-venue'
import type { EventSegment } from '~/types/event-segment'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    casamento_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Cerimônia',
    nome_local: 'Igreja São José',
    endereco_local: 'Rua das Flores, 100',
    latitude_local: -15.6,
    longitude_local: -56.1,
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

describe('resolveEventSegmentVenue', () => {
  it('retorna o segmento sem alterações quando mesmo_local_que não está definido', () => {
    const segment = makeSegment()
    expect(resolveEventSegmentVenue(segment, [segment])).toBe(segment)
  })

  it('substitui os campos de local pelos do segmento referenciado', () => {
    const source = makeSegment({ id: 'source', titulo: 'Cerimônia' })
    const dependent = makeSegment({
      id: 'dependent',
      titulo: 'Recepção',
      mesmo_local_que: 'source',
      nome_local: null,
      endereco_local: null,
      latitude_local: null,
      longitude_local: null,
    })

    const resolved = resolveEventSegmentVenue(dependent, [source, dependent])

    expect(resolved.nome_local).toBe(source.nome_local)
    expect(resolved.endereco_local).toBe(source.endereco_local)
    expect(resolved.latitude_local).toBe(source.latitude_local)
    expect(resolved.longitude_local).toBe(source.longitude_local)
    expect(resolved.titulo).toBe('Recepção') // mantém os próprios dados que não são de local
  })

  it('retorna o segmento original quando o segmento referenciado não é encontrado na lista', () => {
    const segment = makeSegment({ mesmo_local_que: 'não-existe' })
    expect(resolveEventSegmentVenue(segment, [segment])).toBe(segment)
  })
})
