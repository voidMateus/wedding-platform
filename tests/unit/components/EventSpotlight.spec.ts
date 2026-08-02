import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EventSpotlight from '~/components/public/EventSpotlight.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import Button from '~/components/ui/Button.vue'
import type { EventSegment } from '~/types/event-segment'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    wedding_id: '11111111-1111-1111-1111-111111111111',
    title: 'Cerimônia',
    venue_name: 'Igreja São José',
    venue_address: 'Rua das Flores, 100',
    starts_at: '2027-05-16T12:00:00Z',
    ends_at: '2027-05-16T13:00:00Z',
    display_order: 0,
    venue_latitude: null,
    venue_longitude: null,
    same_venue_as: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mountSpotlight(props: Record<string, unknown>) {
  return mount(EventSpotlight, {
    props,
    global: {
      components: {
        UiSectionDivider: SectionDivider,
        PublicEditorialSection: EditorialSection,
        UiButton: Button,
      },
      stubs: {
        ...ICON_STUBS,
        PublicVenueMap: { template: '<div data-test="venue-map" />' },
        NuxtLink: { template: '<a :href="to" :target="target"><slot /></a>', props: ['to', 'target'] },
      },
    },
  })
}

describe('PublicEventSpotlight', () => {
  it('usa o título do segmento como título da seção', () => {
    const wrapper = mountSpotlight({ segment: makeSegment({ title: 'Cerimônia' }) })
    expect(wrapper.find('h2').text()).toBe('Cerimônia')
  })

  it('renderiza local e endereço quando presentes', () => {
    const wrapper = mountSpotlight({ segment: makeSegment() })
    expect(wrapper.text()).toContain('Igreja São José')
    expect(wrapper.text()).toContain('Rua das Flores, 100')
  })

  it('não quebra quando local/endereço estão ausentes', () => {
    const wrapper = mountSpotlight({
      segment: makeSegment({ venue_name: null, venue_address: null }),
    })
    expect(wrapper.text()).not.toContain('null')
  })

  it('formata a faixa de horário quando início e fim existem', () => {
    const wrapper = mountSpotlight({ segment: makeSegment() })
    expect(wrapper.text()).toMatch(/\d{2}:\d{2}\s*–\s*\d{2}:\d{2}/)
  })

  it('propaga o id para a âncora de navegação', () => {
    const wrapper = mountSpotlight({ segment: makeSegment(), id: 'cerimonia' })
    expect(wrapper.find('#cerimonia').exists()).toBe(true)
  })

  it('renderiza o mapa a partir do endereço em texto, mesmo sem coordenadas', () => {
    const wrapper = mountSpotlight({ segment: makeSegment() })
    expect(wrapper.find('[data-test="venue-map"]').exists()).toBe(true)
  })

  it('renderiza o mapa quando há coordenadas (mesmo sem endereço em texto)', () => {
    const wrapper = mountSpotlight({
      segment: makeSegment({
        venue_name: null,
        venue_address: null,
        venue_latitude: -15.6,
        venue_longitude: -56.1,
      }),
    })
    expect(wrapper.find('[data-test="venue-map"]').exists()).toBe(true)
  })

  it('não renderiza o mapa quando não há local, endereço nem coordenadas', () => {
    const wrapper = mountSpotlight({
      segment: makeSegment({ venue_name: null, venue_address: null }),
    })
    expect(wrapper.find('[data-test="venue-map"]').exists()).toBe(false)
  })

  it('botão "Abrir no Google Maps" usa as coordenadas quando existem (prioridade sobre o endereço)', () => {
    const wrapper = mountSpotlight({
      segment: makeSegment({ venue_latitude: -15.6, venue_longitude: -56.1 }),
    })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('-15.6,-56.1')}`,
    )
    expect(link.attributes('target')).toBe('_blank')
  })

  it('botão "Abrir no Google Maps" usa o endereço em texto quando não há coordenadas', () => {
    const wrapper = mountSpotlight({ segment: makeSegment() })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toContain('google.com/maps/search')
    expect(link.attributes('href')).toContain(encodeURIComponent('Igreja São José'))
  })

  it('não renderiza o botão de mapa quando não há local, endereço nem coordenadas', () => {
    const wrapper = mountSpotlight({
      segment: makeSegment({ venue_name: null, venue_address: null }),
    })
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('badge usa o título em maiúsculas quando classificado (Cerimônia/Recepção/Festa)', () => {
    const wrapper = mountSpotlight({ segment: makeSegment({ title: 'Cerimônia' }) })
    const badge = wrapper.find('span.rounded-full')
    expect(badge.text()).toBe('CERIMÔNIA')
  })

  it('badge usa o título original quando não classificado (ex.: chá de panela)', () => {
    const wrapper = mountSpotlight({ segment: makeSegment({ title: 'Chá de panela' }) })
    const badge = wrapper.find('span.rounded-full')
    expect(badge.text()).toBe('Chá de panela')
  })
})
