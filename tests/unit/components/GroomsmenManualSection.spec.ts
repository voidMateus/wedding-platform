import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GroomsmenManualSection from '~/components/public/GroomsmenManualSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import TopicGrid from '~/components/public/TopicGrid.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { GROOMSMEN_MANUAL_CONTENT } from '#shared/wedding-content'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function mountSection() {
  return mount(GroomsmenManualSection, {
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

describe('PublicGroomsmenManualSection', () => {
  it('usa o título "Manual dos Padrinhos" e a âncora #manual-padrinhos', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe('Manual dos Padrinhos')
    expect(wrapper.find('#manual-padrinhos').exists()).toBe(true)
  })

  it('renderiza a introdução e todos os tópicos', () => {
    const wrapper = mountSection()
    expect(wrapper.text()).toContain(GROOMSMEN_MANUAL_CONTENT.intro)
    for (const topic of GROOMSMEN_MANUAL_CONTENT.topics) {
      expect(wrapper.text()).toContain(topic.title)
    }
  })
})
