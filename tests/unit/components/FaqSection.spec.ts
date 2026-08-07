import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FaqSection from '~/components/public/FaqSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import Accordion from '~/components/ui/Accordion.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { FAQ_CONTENT } from '#shared/wedding-content'
import { ICON_STUBS } from '../test-utils/icon-stubs'
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
  return mount(FaqSection, {
    props: { wedding },
    global: {
      components: {
        UiSectionDivider: SectionDivider,
        PublicEditorialSection: EditorialSection,
        UiAccordion: Accordion,
      },
      stubs: ICON_STUBS,
    },
  })
}

describe('PublicFaqSection', () => {
  it('usa o título "Perguntas Frequentes" e a âncora #faq', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe('Perguntas Frequentes')
    expect(wrapper.find('#faq').exists()).toBe(true)
  })

  it('renderiza todas as perguntas do conteúdo padrão', () => {
    const wrapper = mountSection()
    for (const faq of FAQ_CONTENT) {
      expect(wrapper.text()).toContain(faq.question)
    }
  })

  it('usa a lista de perguntas customizada pelo casal quando presente em content_config', () => {
    const wrapper = mountSection(
      makeWedding({ content_config: { faqItems: [{ question: 'Tem estacionamento?', answer: 'Sim.' }] } }),
    )
    expect(wrapper.text()).toContain('Tem estacionamento?')
    expect(wrapper.text()).not.toContain(FAQ_CONTENT[0]!.question)
  })

  it('some inteiramente quando o casal esvazia content_config.faqItems', () => {
    const wrapper = mountSection(makeWedding({ content_config: { faqItems: [] } }))
    expect(wrapper.find('#faq').exists()).toBe(false)
  })
})
