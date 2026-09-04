import { describe, expect, it } from 'vitest'
import {
  commitManualLocation,
  emptyEventSegmentLocation,
  eventSegmentLocationFromSegment,
  hasEventSegmentLocation,
  locationFromPlace,
  locationToMapaLocal,
  manualDraftFrom,
} from '~/utils/event-segment-location'
import type { PlaceDetails } from '~/types/place'
import type { EventSegment } from '~/types/event-segment'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    casamento_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Cerimônia',
    nome_local: null,
    endereco_local: null,
    latitude_local: null,
    longitude_local: null,
    origem_local: null,
    place_id_local: null,
    provedor_local: null,
    url_mapa_local: null,
    logradouro_local: null,
    numero_local: null,
    complemento_local: null,
    cidade_local: null,
    estado_local: null,
    inicia_em: null,
    termina_em: null,
    ordem_exibicao: 1,
    mesmo_local_que: null,
    url_imagem: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('eventSegmentLocationFromSegment', () => {
  it('converte uma seleção do provedor preservando place_id e provedor', () => {
    const location = eventSegmentLocationFromSegment(
      makeSegment({
        nome_local: 'Buffet Exemplo',
        endereco_local: 'Av. Miguel Sutil, 1234',
        latitude_local: -15.601398,
        longitude_local: -56.097892,
        origem_local: 'maps_place',
        place_id_local: 'ChIJ1',
        provedor_local: 'google',
        url_mapa_local: 'https://maps.google.com/?cid=9',
      }),
    )

    expect(location).toMatchObject({
      nomeLocal: 'Buffet Exemplo',
      enderecoLocal: 'Av. Miguel Sutil, 1234',
      latitudeLocal: '-15.601398',
      longitudeLocal: '-56.097892',
      origemLocal: 'maps_place',
      placeIdLocal: 'ChIJ1',
      provedorLocal: 'google',
      urlMapaLocal: 'https://maps.google.com/?cid=9',
    })
  })

  it('linha legada (sem origem) abre como local comum, sem origem inventada', () => {
    const location = eventSegmentLocationFromSegment(
      makeSegment({ endereco_local: 'Rua das Flores, 100' }),
    )

    expect(location.origemLocal).toBe('')
    expect(location.placeIdLocal).toBe('')
    expect(location.enderecoLocal).toBe('Rua das Flores, 100')
  })

  it('origem desconhecida no banco não vaza para o formulário', () => {
    const location = eventSegmentLocationFromSegment(makeSegment({ origem_local: 'osm_place' }))

    expect(location.origemLocal).toBe('')
  })

  it('coordenada zero não é confundida com "não definida"', () => {
    const location = eventSegmentLocationFromSegment(
      makeSegment({ latitude_local: 0, longitude_local: 0 }),
    )

    expect(location.latitudeLocal).toBe('0')
    expect(location.longitudeLocal).toBe('0')
  })

  it('preserva as partes do endereço manual para reabrir o formulário', () => {
    const location = eventSegmentLocationFromSegment(
      makeSegment({
        origem_local: 'manual',
        logradouro_local: 'Estrada da Guarita, km 8',
        numero_local: 's/n',
        complemento_local: 'Portão azul',
        cidade_local: 'Chapada dos Guimarães',
        estado_local: 'MT',
      }),
    )

    expect(location).toMatchObject({
      origemLocal: 'manual',
      logradouroLocal: 'Estrada da Guarita, km 8',
      numeroLocal: 's/n',
      complementoLocal: 'Portão azul',
      cidadeLocal: 'Chapada dos Guimarães',
      estadoLocal: 'MT',
    })
  })
})

describe('hasEventSegmentLocation', () => {
  it('local vazio', () => {
    expect(hasEventSegmentLocation(emptyEventSegmentLocation())).toBe(false)
  })

  it('só espaços em branco também é vazio', () => {
    expect(hasEventSegmentLocation({ ...emptyEventSegmentLocation(), nomeLocal: '   ' })).toBe(
      false,
    )
  })

  it('basta o nome, ou basta o endereço', () => {
    expect(hasEventSegmentLocation({ ...emptyEventSegmentLocation(), nomeLocal: 'Chácara' })).toBe(
      true,
    )
    expect(
      hasEventSegmentLocation({ ...emptyEventSegmentLocation(), enderecoLocal: 'Rua 1' }),
    ).toBe(true)
  })
})

const place: PlaceDetails = {
  placeId: 'ChIJ1',
  name: 'Buffet Exemplo',
  formattedAddress: 'Av. Miguel Sutil, 1234 - Cuiabá, MT',
  latitude: -15.601398,
  longitude: -56.097892,
  mapsUrl: 'https://maps.google.com/?cid=9',
  city: 'Cuiabá',
  state: 'MT',
}

describe('locationFromPlace', () => {
  it('preenche nome, endereço, coordenadas e identificação do lugar', () => {
    expect(locationFromPlace(place, 'google')).toMatchObject({
      nomeLocal: 'Buffet Exemplo',
      enderecoLocal: 'Av. Miguel Sutil, 1234 - Cuiabá, MT',
      latitudeLocal: '-15.601398',
      longitudeLocal: '-56.097892',
      origemLocal: 'maps_place',
      placeIdLocal: 'ChIJ1',
      provedorLocal: 'google',
      urlMapaLocal: 'https://maps.google.com/?cid=9',
      cidadeLocal: 'Cuiabá',
      estadoLocal: 'MT',
    })
  })

  it('não deixa logradouro/número de um cadastro manual anterior sobreviverem', () => {
    const resultado = locationFromPlace(place, 'google')
    expect(resultado.logradouroLocal).toBe('')
    expect(resultado.numeroLocal).toBe('')
    expect(resultado.complementoLocal).toBe('')
  })

  it('provedor sem URL oficial grava string vazia, não undefined', () => {
    expect(locationFromPlace({ ...place, mapsUrl: null }, 'google').urlMapaLocal).toBe('')
  })
})

describe('manualDraftFrom', () => {
  it('larga a identificação do lugar ao virar manual', () => {
    const draft = manualDraftFrom(locationFromPlace(place, 'google'))

    expect(draft.placeIdLocal).toBe('')
    expect(draft.provedorLocal).toBe('')
    expect(draft.urlMapaLocal).toBe('')
    expect(draft.origemLocal).toBe('manual')
  })

  it('aproveita nome e cidade como ponto de partida', () => {
    const draft = manualDraftFrom(locationFromPlace(place, 'google'))

    expect(draft.nomeLocal).toBe('Buffet Exemplo')
    expect(draft.cidadeLocal).toBe('Cuiabá')
  })
})

describe('commitManualLocation', () => {
  it('recompõe o endereço de exibição a partir das partes', () => {
    const resultado = commitManualLocation({
      ...emptyEventSegmentLocation(),
      nomeLocal: 'Chácara Recanto das Flores',
      logradouroLocal: 'Estrada da Guarita, km 8',
      cidadeLocal: 'Chapada dos Guimarães',
      estadoLocal: 'MT',
    })

    expect(resultado.enderecoLocal).toBe('Estrada da Guarita, km 8 · Chapada dos Guimarães - MT')
    expect(resultado.origemLocal).toBe('manual')
  })

  it('sobrescreve o endereço herdado de uma escolha anterior no Maps', () => {
    const partindoDoMaps = manualDraftFrom(locationFromPlace(place, 'google'))

    const resultado = commitManualLocation({
      ...partindoDoMaps,
      logradouroLocal: 'Rua Nova',
      numeroLocal: '10',
    })

    expect(resultado.enderecoLocal).toBe('Rua Nova, 10 · Cuiabá - MT')
    expect(resultado.placeIdLocal).toBe('')
  })

  it('mantém a posição definida no mapa', () => {
    const resultado = commitManualLocation({
      ...emptyEventSegmentLocation(),
      nomeLocal: 'Sítio',
      latitudeLocal: '-15.4',
      longitudeLocal: '-55.7',
    })

    expect(resultado.latitudeLocal).toBe('-15.4')
    expect(resultado.longitudeLocal).toBe('-55.7')
  })
})

describe('locationToMapaLocal', () => {
  it('converte string vazia em null e coordenada em número', () => {
    expect(locationToMapaLocal(locationFromPlace(place, 'google'))).toEqual({
      nome_local: 'Buffet Exemplo',
      endereco_local: 'Av. Miguel Sutil, 1234 - Cuiabá, MT',
      latitude_local: -15.601398,
      longitude_local: -56.097892,
      place_id_local: 'ChIJ1',
      url_mapa_local: 'https://maps.google.com/?cid=9',
    })
  })

  it('local vazio vira tudo null — nada de mapa nem de link', () => {
    expect(locationToMapaLocal(emptyEventSegmentLocation())).toEqual({
      nome_local: null,
      endereco_local: null,
      latitude_local: null,
      longitude_local: null,
      place_id_local: null,
      url_mapa_local: null,
    })
  })
})
