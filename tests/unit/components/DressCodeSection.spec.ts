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
    global: {
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection },
      stubs: { PublicDressCodeIllustration: { template: '<svg data-test="dress-code-illustration" />' } },
    },
  })
}

describe('PublicDressCodeSection', () => {
  it('usa o título "Dress Code" e a âncora #dress-code', () => {
    const wrapper = mountDressCode(makeWedding())
    expect(wrapper.find('h2').text()).toBe('Dress Code')
    expect(wrapper.find('#dress-code').exists()).toBe(true)
  })

  it('renderiza a ilustração decorativa', () => {
    const wrapper = mountDressCode(makeWedding())
    expect(wrapper.find('[data-test="dress-code-illustration"]').exists()).toBe(true)
  })

  it('renderiza a descrição e todas as dicas', () => {
    const wrapper = mountDressCode(makeWedding())
    expect(wrapper.text()).toContain(DRESS_CODE_CONTENT.description)
    for (const tip of DRESS_CODE_CONTENT.suggestions) {
      expect(wrapper.text()).toContain(tip)
    }
  })

  it('cai nas cores default quando o tema não define paleta', () => {
    const wrapper = mountDressCode(makeWedding({ theme_config: {} }))
    expect(wrapper.html()).not.toContain('undefined')
  })
})
