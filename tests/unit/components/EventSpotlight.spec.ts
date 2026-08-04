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
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection, UiButton: Button },
      stubs: {
        ...ICON_STUBS,
        PublicVenueMap: { template: '<div data-test="venue-map" />' },
        NuxtLink: { template: '<a :href="to" :target="target"><slot /></a>', props: ['to', 'target'] },
      },
    },
  })
}

describe('PublicEventSpotlight', () => {
  it('usa o título do segmento como título da seção quando há um único momento', () => {
    const wrapper = mountSpotlight({ segments: [makeSegment({ title: 'Cerimônia' })] })
    expect(wrapper.find('h2').text()).toBe('Cerimônia')
  })

  it('a âncora é derivada do título classificado', () => {
    const wrapper = mountSpotlight({ segments: [makeSegment({ title: 'Cerimônia' })] })
    expect(wrapper.find('#cerimonia').exists()).toBe(true)
  })

  it('renderiza o mapa a partir do endereço em texto', () => {
    const wrapper = mountSpotlight({ segments: [makeSegment()] })
    expect(wrapper.find('[data-test="venue-map"]').exists()).toBe(true)
  })

  describe('fusão quando Cerimônia e Recepção têm o mesmo endereço', () => {
    function makeMergedGroup() {
      const ceremony = makeSegment({ id: 'a', title: 'Cerimônia', starts_at: '2027-05-16T16:00:00Z' })
      const reception = makeSegment({ id: 'b', title: 'Recepção', same_venue_as: 'a', starts_at: '2027-05-16T18:00:00Z' })
      return [ceremony, reception]
    }

    it('junta os títulos no título da seção', () => {
      const wrapper = mountSpotlight({ segments: makeMergedGroup() })
      expect(wrapper.find('h2').text()).toBe('Cerimônia e Recepção')
    })

    it('renderiza um badge por momento e um único mapa/botão', () => {
      const wrapper = mountSpotlight({ segments: makeMergedGroup() })
      expect(wrapper.findAll('span.rounded-full')).toHaveLength(2)
      expect(wrapper.findAll('[data-test="venue-map"]')).toHaveLength(1)
      expect(wrapper.findAll('a')).toHaveLength(1)
    })

    it('expõe as duas âncoras (#cerimonia na seção, #recepcao interna)', () => {
      const wrapper = mountSpotlight({ segments: makeMergedGroup() })
      expect(wrapper.find('section').attributes('id')).toBe('cerimonia')
      expect(wrapper.find('#recepcao').exists()).toBe(true)
    })
  })
})
