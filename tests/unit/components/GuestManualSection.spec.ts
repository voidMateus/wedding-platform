import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GuestManualSection from '~/components/public/GuestManualSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import TopicGrid from '~/components/public/TopicGrid.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { GUEST_MANUAL_CONTENT } from '#shared/wedding-content'
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
  return mount(GuestManualSection, {
    props: { wedding },
    global: {
      components: {
        UiSectionDivider: SectionDivider,
        PublicEditorialSection: EditorialSection,
        PublicTopicGrid: TopicGrid,
      },
      stubs: ICON_STUBS,
    },
  })
}

describe('PublicGuestManualSection', () => {
  it('usa o título "Manual dos Convidados" e a âncora #manual-convidados', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe('Manual dos Convidados')
    expect(wrapper.find('#manual-convidados').exists()).toBe(true)
  })

  it('renderiza a introdução e todos os tópicos padrão', () => {
    const wrapper = mountSection()
    expect(wrapper.text()).toContain(GUEST_MANUAL_CONTENT.intro)
    for (const topic of GUEST_MANUAL_CONTENT.topics) {
      expect(wrapper.text()).toContain(topic.title)
    }
  })

  it('usa introdução/tópicos customizados pelo casal quando presentes em content_config', () => {
    const wrapper = mountSection(
      makeWedding({
        content_config: {
          guestManualIntro: 'Leia com carinho.',
          guestManualTopics: [{ icon: 'lucide:info', title: 'Estacionamento', description: 'Vagas no local.' }],
        },
      }),
    )
    expect(wrapper.text()).toContain('Leia com carinho.')
    expect(wrapper.text()).toContain('Estacionamento')
    expect(wrapper.text()).not.toContain(GUEST_MANUAL_CONTENT.intro)
  })

  it('some inteiramente quando o casal esvazia content_config.guestManualTopics', () => {
    const wrapper = mountSection(makeWedding({ content_config: { guestManualTopics: [] } }))
    expect(wrapper.find('#manual-convidados').exists()).toBe(false)
  })
})
