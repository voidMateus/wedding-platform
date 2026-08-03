import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DressCodeSection from '~/components/public/DressCodeSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { DRESS_CODE_CONTENT } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

function makeWedding(overrides: Partial<Wedding> = {}): Wedding {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'ana-e-joao',
    couple_names: 'Ana & João',
    event_date: '2027-05-16',
    event_time: '20:30:00',
    child_max_age: 11,
    guest_list_mode: 'closed',
    rsvp_deadline: null,
    theme_config: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Wedding
}

function mountDressCode(wedding: Wedding) {
  return mount(DressCodeSection, {
    props: { wedding },
    global: { components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection } },
  })
}

describe('PublicDressCodeSection', () => {
  it('usa o título "Dress Code" e a âncora #dress-code', () => {
    const wrapper = mountDressCode(makeWedding())
    expect(wrapper.find('h2').text()).toBe('Dress Code')
    expect(wrapper.find('#dress-code').exists()).toBe(true)
  })

  it('renderiza a descrição e todas as dicas', () => {
    const wrapper = mountDressCode(makeWedding())
    expect(wrapper.text()).toContain(DRESS_CODE_CONTENT.description)
    for (const tip of DRESS_CODE_CONTENT.suggestions) {
      expect(wrapper.text()).toContain(tip)
    }
  })

  it('usa as cores primária/secundária do tema como swatches', () => {
    const wrapper = mountDressCode(
      makeWedding({ theme_config: { primaryColor: '#5c1a2b', secondaryColor: '#8a6a1f' } }),
    )
    const swatches = wrapper.findAll('span[aria-hidden="true"]')
    const colors = swatches.map((s) => (s.attributes('style') ?? '').replace(/\s/g, ''))
    expect(colors.some((c) => c.includes('background-color:#5c1a2b'))).toBe(true)
    expect(colors.some((c) => c.includes('background-color:#8a6a1f'))).toBe(true)
  })

  it('cai nas cores default quando o tema não define paleta', () => {
    const wrapper = mountDressCode(makeWedding({ theme_config: {} }))
    expect(wrapper.html()).not.toContain('undefined')
  })
})
