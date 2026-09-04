import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EventSpotlight from '~/components/public/EventSpotlight.vue'
import Button from '~/components/ui/Button.vue'
import type { EventSegment } from '~/types/event-segment'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    casamento_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Cerimônia',
    nome_local: 'Igreja São José',
    endereco_local: 'Rua das Flores, 100',
    inicia_em: '2027-05-16T12:00:00Z',
    termina_em: '2027-05-16T13:00:00Z',
    ordem_exibicao: 0,
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
    mesmo_local_que: null,
    url_imagem: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mountSpotlight(props: Record<string, unknown>) {
  return mount(EventSpotlight, {
    props,
    global: {
      components: { UiButton: Button },
      stubs: {
        ...ICON_STUBS,
        UiVenueMap: { template: '<div data-test="venue-map" />' },
        NuxtLink: {
          template: '<a :href="to" :target="target"><slot /></a>',
          props: ['to', 'target'],
        },
        NuxtImg: { template: '<img :src="src" :alt="alt" />', props: ['src', 'alt', 'sizes'] },
      },
    },
  })
}

describe('PublicEventSpotlight', () => {
  it('é apenas o cartão (sem seção/título próprios — vive dentro de "O Grande Dia")', () => {
    const wrapper = mountSpotlight({ segments: [makeSegment({ titulo: 'Cerimônia' })] })
    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.find('h2').exists()).toBe(false)
  })

  it('a âncora é derivada do título classificado', () => {
    const wrapper = mountSpotlight({ segments: [makeSegment({ titulo: 'Cerimônia' })] })
    expect(wrapper.find('#cerimonia').exists()).toBe(true)
  })

  it('renderiza o mapa a partir do endereço em texto', () => {
    const wrapper = mountSpotlight({ segments: [makeSegment()] })
    expect(wrapper.find('[data-test="venue-map"]').exists()).toBe(true)
  })

  it('renderiza a foto do local quando cadastrada', () => {
    const wrapper = mountSpotlight({
      segments: [makeSegment({ url_imagem: 'https://example.com/foto.jpg' })],
    })
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/foto.jpg')
  })

  it('não renderiza nenhuma imagem quando o local não tem foto', () => {
    const wrapper = mountSpotlight({ segments: [makeSegment({ url_imagem: null })] })
    expect(wrapper.find('img').exists()).toBe(false)
  })

  describe('fusão quando Cerimônia e Recepção têm o mesmo endereço', () => {
    function makeMergedGroup() {
      const ceremony = makeSegment({
        id: 'a',
        titulo: 'Cerimônia',
        inicia_em: '2027-05-16T16:00:00Z',
      })
      const reception = makeSegment({
        id: 'b',
        titulo: 'Recepção',
        mesmo_local_que: 'a',
        inicia_em: '2027-05-16T18:00:00Z',
      })
      return [ceremony, reception]
    }

    it('renderiza um badge por momento e um único mapa/botão', () => {
      const wrapper = mountSpotlight({ segments: makeMergedGroup() })
      expect(wrapper.findAll('span.rounded-full')).toHaveLength(2)
      expect(wrapper.findAll('[data-test="venue-map"]')).toHaveLength(1)
      expect(wrapper.findAll('a')).toHaveLength(1)
    })

    it('expõe as duas âncoras internas (#cerimonia e #recepcao)', () => {
      const wrapper = mountSpotlight({ segments: makeMergedGroup() })
      expect(wrapper.find('#cerimonia').exists()).toBe(true)
      expect(wrapper.find('#recepcao').exists()).toBe(true)
    })
  })

  describe('link "Abrir no Google Maps"', () => {
    function mapsHref(segment: EventSegment): string | undefined {
      return mountSpotlight({ segments: [segment] })
        .find('a')
        .attributes('href')
    }

    it('usa a URL oficial do provedor quando ela existe', () => {
      const href = mapsHref(
        makeSegment({ url_mapa_local: 'https://maps.google.com/?cid=123', place_id_local: 'p-1' }),
      )
      expect(href).toBe('https://maps.google.com/?cid=123')
    })

    it('ignora uma URL de host não confiável e cai no place_id', () => {
      const href = mapsHref(
        makeSegment({ url_mapa_local: 'https://phishing.example.com/x', place_id_local: 'p-1' }),
      )
      expect(href).toContain('query_place_id=p-1')
      expect(href).not.toContain('phishing')
    })

    it('resolve pelo place_id em vez de refazer busca textual', () => {
      const href = mapsHref(makeSegment({ place_id_local: 'ChIJabc' }))
      expect(href).toContain('query_place_id=ChIJabc')
    })

    it('linha legada, só com endereço em texto, continua abrindo pela busca', () => {
      const href = mapsHref(makeSegment())
      expect(href).toContain('query=Igreja')
      expect(href).not.toContain('query_place_id')
    })
  })
})
