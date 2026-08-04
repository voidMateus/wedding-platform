import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GrandeDiaSection from '~/components/public/GrandeDiaSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import type { EventSegment } from '~/types/event-segment'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    wedding_id: '11111111-1111-1111-1111-111111111111',
    title: 'Cerimônia',
    venue_name: 'Igreja São José',
    venue_address: 'Rua das Flores, 100',
    starts_at: null,
    ends_at: null,
    display_order: 0,
    venue_latitude: null,
    venue_longitude: null,
    same_venue_as: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mountSection(groups: EventSegment[][]) {
  return mount(GrandeDiaSection, {
    props: { groups },
    global: {
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection },
      stubs: {
        ...ICON_STUBS,
        PublicEventSpotlight: { template: '<div data-test="spotlight-card" />' },
      },
    },
  })
}

describe('PublicGrandeDiaSection', () => {
  it('usa sempre o título fixo "O Grande Dia" e a âncora #grande-dia', () => {
    const wrapper = mountSection([[makeSegment({ id: 'a', title: 'Cerimônia' })]])
    expect(wrapper.find('h2').text()).toBe('O Grande Dia')
    expect(wrapper.find('#grande-dia').exists()).toBe(true)
  })

  it('não renderiza nada quando não há grupos', () => {
    const wrapper = mountSection([])
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('renderiza um cartão por grupo (endereços diferentes → dois cartões)', () => {
    const wrapper = mountSection([
      [makeSegment({ id: 'a', title: 'Cerimônia' })],
      [makeSegment({ id: 'b', title: 'Recepção' })],
    ])
    expect(wrapper.findAll('[data-test="spotlight-card"]')).toHaveLength(2)
  })

  it('renderiza um único cartão quando os segmentos já vêm fundidos no mesmo grupo', () => {
    const wrapper = mountSection([
      [makeSegment({ id: 'a', title: 'Cerimônia' }), makeSegment({ id: 'b', title: 'Recepção', same_venue_as: 'a' })],
    ])
    expect(wrapper.findAll('[data-test="spotlight-card"]')).toHaveLength(1)
  })
})
