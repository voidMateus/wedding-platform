import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RsvpTeaserSection from '~/components/public/RsvpTeaserSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import type { Wedding } from '~/types/wedding'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function makeWedding(overrides: Partial<Wedding> = {}): Wedding {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'ana-e-joao',
    couple_names: 'Ana & João',
    event_date: '2027-05-16',
    event_time: '20:30:00',
    rsvp_mode: 'per_guest',
    rsvp_deadline: null,
    theme_config: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Wedding
}

function mountSection(wedding: Wedding = makeWedding()) {
  return mount(RsvpTeaserSection, {
    props: { wedding },
    global: {
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection },
      stubs: ICON_STUBS,
    },
  })
}

describe('PublicRsvpTeaserSection', () => {
  it('usa o título "Confirme sua Presença" e a âncora #confirmar-presenca', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe('Confirme sua Presença')
    expect(wrapper.find('#confirmar-presenca').exists()).toBe(true)
  })

  it('mostra o nome do casal e a data formatada', () => {
    const wrapper = mountSection(makeWedding({ couple_names: 'Ana & João', event_date: '2027-05-16' }))
    expect(wrapper.text()).toContain('Ana & João')
    expect(wrapper.text()).toContain('16 de maio de 2027')
  })

  it('não renderiza nenhum formulário funcional (só texto explicativo)', () => {
    const wrapper = mountSection()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(false)
  })
})
