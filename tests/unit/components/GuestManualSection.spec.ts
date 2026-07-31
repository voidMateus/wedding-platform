import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GuestManualSection from '~/components/public/GuestManualSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import TopicGrid from '~/components/public/TopicGrid.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { GUEST_MANUAL_CONTENT } from '#shared/wedding-content'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function mountSection() {
  return mount(GuestManualSection, {
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

  it('renderiza a introdução e todos os tópicos', () => {
    const wrapper = mountSection()
    expect(wrapper.text()).toContain(GUEST_MANUAL_CONTENT.intro)
    for (const topic of GUEST_MANUAL_CONTENT.topics) {
      expect(wrapper.text()).toContain(topic.title)
    }
  })
})
