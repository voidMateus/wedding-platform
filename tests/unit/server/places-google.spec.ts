import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGooglePlacesProvider } from '../../../server/utils/places-google'

// $fetch é global do Nitro (auto-import) — fora do runtime do servidor
// precisa ser stubado para os testes exercitarem o código real.
beforeEach(() => {
  vi.stubGlobal('$fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const provider = () => createGooglePlacesProvider('chave-de-teste')
const fetchMock = () => $fetch as unknown as ReturnType<typeof vi.fn>

describe('createGooglePlacesProvider.autocomplete', () => {
  it('normaliza as sugestões em duas linhas (nome + endereço que as diferencia)', async () => {
    fetchMock().mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            placeId: 'ChIJ1',
            structuredFormat: {
              mainText: { text: 'Buffet Exemplo' },
              secondaryText: { text: 'Av. Miguel Sutil, 1234 - Cuiabá, MT' },
            },
          },
        },
      ],
    })

    const result = await provider().autocomplete({ query: 'buffet', sessionToken: 's' })

    expect(result).toEqual({
      ok: true,
      data: [
        {
          placeId: 'ChIJ1',
          mainText: 'Buffet Exemplo',
          secondaryText: 'Av. Miguel Sutil, 1234 - Cuiabá, MT',
        },
      ],
    })
  })

  it('cai no texto de linha única quando o Google não manda structuredFormat', async () => {
    fetchMock().mockResolvedValue({
      suggestions: [
        { placePrediction: { placeId: 'ChIJ2', text: { text: 'Rua das Flores, 100' } } },
      ],
    })

    const result = await provider().autocomplete({ query: 'rua', sessionToken: 's' })

    expect(result.ok && result.data[0]).toEqual({
      placeId: 'ChIJ2',
      mainText: 'Rua das Flores, 100',
      secondaryText: null,
    })
  })

  it('descarta sugestão sem placeId — sem id não dá para escolher nada', async () => {
    fetchMock().mockResolvedValue({
      suggestions: [
        { placePrediction: { text: { text: 'sem id' } } },
        { placePrediction: { placeId: 'ChIJ3', text: { text: 'com id' } } },
      ],
    })

    const result = await provider().autocomplete({ query: 'x', sessionToken: 's' })

    expect(result.ok && result.data).toHaveLength(1)
  })

  it('resposta vazia devolve lista vazia, nunca erro — é o gatilho do caminho manual', async () => {
    fetchMock().mockResolvedValue({})

    const result = await provider().autocomplete({ query: 'x', sessionToken: 's' })

    expect(result).toEqual({ ok: true, data: [] })
  })

  it('falha de rede vira ok:false em vez de exceção', async () => {
    fetchMock().mockRejectedValue(new Error('timeout'))

    const result = await provider().autocomplete({ query: 'x', sessionToken: 's' })

    expect(result.ok).toBe(false)
  })

  it('manda a chave no header e restringe a busca ao Brasil', async () => {
    fetchMock().mockResolvedValue({ suggestions: [] })

    await provider().autocomplete({ query: 'igreja', sessionToken: 'sessao-1' })

    const [, options] = fetchMock().mock.calls[0]!
    expect(options.headers['X-Goog-Api-Key']).toBe('chave-de-teste')
    expect(options.body).toMatchObject({
      input: 'igreja',
      regionCode: 'BR',
      includedRegionCodes: ['br'],
      sessionToken: 'sessao-1',
    })
  })
})

describe('createGooglePlacesProvider.details', () => {
  const respostaCompleta = {
    id: 'ChIJ1',
    displayName: { text: 'Buffet Exemplo' },
    formattedAddress: 'Av. Miguel Sutil, 1234 - Cuiabá, MT, 78048-000, Brasil',
    location: { latitude: -15.601398, longitude: -56.097892 },
    googleMapsUri: 'https://maps.google.com/?cid=99',
    addressComponents: [
      { longText: 'Cuiabá', shortText: 'Cuiabá', types: ['locality'] },
      { longText: 'Mato Grosso', shortText: 'MT', types: ['administrative_area_level_1'] },
    ],
  }

  it('normaliza os detalhes, incluindo cidade e UF', async () => {
    fetchMock().mockResolvedValue(respostaCompleta)

    const result = await provider().details({ placeId: 'ChIJ1', sessionToken: 's' })

    expect(result).toEqual({
      ok: true,
      data: {
        placeId: 'ChIJ1',
        name: 'Buffet Exemplo',
        formattedAddress: 'Av. Miguel Sutil, 1234 - Cuiabá, MT, 78048-000, Brasil',
        latitude: -15.601398,
        longitude: -56.097892,
        mapsUrl: 'https://maps.google.com/?cid=99',
        city: 'Cuiabá',
        state: 'MT',
      },
    })
  })

  it('usa administrative_area_level_2 quando não há locality (endereço rural)', async () => {
    fetchMock().mockResolvedValue({
      ...respostaCompleta,
      addressComponents: [
        {
          longText: 'Chapada dos Guimarães',
          shortText: 'Chapada',
          types: ['administrative_area_level_2'],
        },
        { longText: 'Mato Grosso', shortText: 'MT', types: ['administrative_area_level_1'] },
      ],
    })

    const result = await provider().details({ placeId: 'ChIJ1', sessionToken: 's' })

    expect(result.ok && result.data?.city).toBe('Chapada dos Guimarães')
  })

  it('lugar sem coordenadas é tratado como não encontrado', async () => {
    fetchMock().mockResolvedValue({ ...respostaCompleta, location: undefined })

    const result = await provider().details({ placeId: 'ChIJ1', sessionToken: 's' })

    expect(result).toEqual({ ok: true, data: null })
  })

  it('404 do Google é "não encontrado", não instabilidade', async () => {
    fetchMock().mockRejectedValue(Object.assign(new Error('Not Found'), { statusCode: 404 }))

    const result = await provider().details({ placeId: 'expirado', sessionToken: 's' })

    expect(result).toEqual({ ok: true, data: null })
  })

  it('erro de rede vira ok:false', async () => {
    fetchMock().mockRejectedValue(new Error('ECONNRESET'))

    const result = await provider().details({ placeId: 'ChIJ1', sessionToken: 's' })

    expect(result.ok).toBe(false)
  })

  it('pede só os campos usados — cada campo a mais tem custo por requisição', async () => {
    fetchMock().mockResolvedValue(respostaCompleta)

    await provider().details({ placeId: 'ChIJ1', sessionToken: 's' })

    const [url, options] = fetchMock().mock.calls[0]!
    expect(url).toBe('https://places.googleapis.com/v1/places/ChIJ1')
    expect(options.headers['X-Goog-FieldMask']).toBe(
      'id,displayName,formattedAddress,location,googleMapsUri,addressComponents',
    )
  })
})
