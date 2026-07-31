import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FaqSection from '~/components/public/FaqSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import Accordion from '~/components/ui/Accordion.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { FAQ_CONTENT } from '#shared/wedding-content'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function mountSection() {
  return mount(FaqSection, {
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

  it('renderiza todas as perguntas do conteúdo fixo', () => {
    const wrapper = mountSection()
    for (const faq of FAQ_CONTENT) {
      expect(wrapper.text()).toContain(faq.question)
    }
  })
})
