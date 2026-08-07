import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WelcomeSection from '~/components/public/WelcomeSection.vue'
import { WELCOME_CONTENT } from '#shared/wedding-content'
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
    content_config: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Wedding
}

function mountSection(wedding: Wedding = makeWedding()) {
  return mount(WelcomeSection, {
    props: { wedding },
    global: {
      stubs: {
        PublicHeroFlourish: { template: '<svg data-test="flourish" />' },
      },
    },
  })
}

describe('PublicWelcomeSection', () => {
  it('sem customização, renderiza o título e os parágrafos de boas-vindas padrão, sem nenhum card', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe(WELCOME_CONTENT.title)
    for (const paragraph of WELCOME_CONTENT.paragraphs) {
      expect(wrapper.text()).toContain(paragraph)
    }
    expect(wrapper.find('.rounded-lg').exists()).toBe(false)
    expect(wrapper.find('.rounded-xl').exists()).toBe(false)
  })

  it('renderiza o ornamento e o coração decorativos', () => {
    const wrapper = mountSection()
    expect(wrapper.find('[data-test="flourish"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('♥')
  })

  it('usa o título/mensagem customizados pelo casal quando presentes em content_config', () => {
    const wrapper = mountSection(
      makeWedding({
        content_config: { welcomeTitle: 'Bem-vindos!', welcomeMessage: 'Mensagem custom.' },
      }),
    )
    expect(wrapper.find('h2').text()).toBe('Bem-vindos!')
    expect(wrapper.text()).toContain('Mensagem custom.')
    expect(wrapper.text()).not.toContain(WELCOME_CONTENT.title)
  })
})
