import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EventSpotlight from '~/components/public/EventSpotlight.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import type { EventSegment } from '~/types/event-segment'

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
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mountSpotlight(props: Record<string, unknown>) {
  return mount(EventSpotlight, {
    props,
    global: {
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection },
      stubs: {
        Icon: { template: '<span />', props: ['name'] },
        NuxtIcon: { template: '<span />', props: ['name'] },
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
})
