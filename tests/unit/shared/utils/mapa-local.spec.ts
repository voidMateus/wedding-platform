import { describe, expect, it } from 'vitest'
import {
  ehUrlDeMapaSegura,
  montarConsultaEmbedMapa,
  montarUrlMapa,
  type LocalParaMapa,
} from '#shared/utils/mapa-local'

function local(overrides: Partial<LocalParaMapa> = {}): LocalParaMapa {
  return {
    nome_local: null,
    endereco_local: null,
    latitude_local: null,
    longitude_local: null,
    place_id_local: null,
    url_mapa_local: null,
    ...overrides,
  }
}

describe('ehUrlDeMapaSegura', () => {
  it('aceita os hosts do provedor', () => {
    expect(ehUrlDeMapaSegura('https://maps.google.com/?cid=123')).toBe(true)
    expect(ehUrlDeMapaSegura('https://www.google.com/maps/place/x')).toBe(true)
    expect(ehUrlDeMapaSegura('https://maps.app.goo.gl/abc')).toBe(true)
  })

  it('recusa host de fora da allowlist', () => {
    expect(ehUrlDeMapaSegura('https://google.com.phishing.example/maps')).toBe(false)
    expect(ehUrlDeMapaSegura('https://evil.example.com/maps')).toBe(false)
  })

  it('recusa qualquer protocolo que não seja https', () => {
    expect(ehUrlDeMapaSegura('http://maps.google.com/?cid=123')).toBe(false)
    expect(ehUrlDeMapaSegura('javascript:alert(1)')).toBe(false)
    expect(ehUrlDeMapaSegura('data:text/html,<script>')).toBe(false)
  })

  it('recusa texto que não é URL', () => {
    expect(ehUrlDeMapaSegura('Rua das Flores, 100')).toBe(false)
    expect(ehUrlDeMapaSegura('')).toBe(false)
  })
})

describe('montarUrlMapa', () => {
  it('prefere a URL oficial do provedor', () => {
    const url = montarUrlMapa(
      local({
        url_mapa_local: 'https://maps.google.com/?cid=9',
        place_id_local: 'p',
        nome_local: 'Buffet',
      }),
    )
    expect(url).toBe('https://maps.google.com/?cid=9')
  })

  it('descarta URL de host não confiável e usa o place_id', () => {
    const url = montarUrlMapa(
      local({
        url_mapa_local: 'https://evil.example.com/x',
        place_id_local: 'ChIJ1',
        nome_local: 'Buffet',
      }),
    )
    expect(url).toContain('query_place_id=ChIJ1')
    expect(url).not.toContain('evil.example.com')
  })

  it('com place_id, resolve pelo id — nunca uma nova busca textual', () => {
    const url = montarUrlMapa(
      local({
        place_id_local: 'ChIJ2',
        nome_local: 'Buffet Exemplo',
        endereco_local: 'Av. Miguel Sutil, 1234',
      }),
    )
    expect(url).toContain('query_place_id=ChIJ2')
  })

  it('sem place_id, usa as coordenadas antes do texto', () => {
    const url = montarUrlMapa(
      local({ latitude_local: -15.6, longitude_local: -56.1, nome_local: 'Chácara' }),
    )
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=-15.6,-56.1')
  })

  it('linha legada, só com endereço em texto, cai na busca por texto', () => {
    const url = montarUrlMapa(
      local({ nome_local: 'Igreja São José', endereco_local: 'Rua das Flores, 100' }),
    )
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=Igreja%20S%C3%A3o%20Jos%C3%A9%2C%20Rua%20das%20Flores%2C%20100',
    )
  })

  it('sem nenhuma informação de local, não há link', () => {
    expect(montarUrlMapa(local())).toBeNull()
  })
})

describe('montarConsultaEmbedMapa', () => {
  it('usa coordenadas quando existem — o embed sem chave não entende place_id', () => {
    expect(
      montarConsultaEmbedMapa(
        local({
          latitude_local: -15.6,
          longitude_local: -56.1,
          place_id_local: 'ChIJ3',
          nome_local: 'X',
        }),
      ),
    ).toBe('-15.6,-56.1')
  })

  it('cai no texto quando não há coordenadas', () => {
    expect(montarConsultaEmbedMapa(local({ nome_local: 'Igreja', endereco_local: 'Rua 1' }))).toBe(
      'Igreja, Rua 1',
    )
  })

  it('sem local nenhum, não há mapa para embutir', () => {
    expect(montarConsultaEmbedMapa(local())).toBeNull()
  })
})
