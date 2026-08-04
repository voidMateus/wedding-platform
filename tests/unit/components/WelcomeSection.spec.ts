import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WelcomeSection from '~/components/public/WelcomeSection.vue'
import { WELCOME_CONTENT } from '#shared/wedding-content'

function mountSection() {
  return mount(WelcomeSection, {
    global: {
      stubs: {
        PublicHeroFlourish: { template: '<svg data-test="flourish" />' },
      },
    },
  })
}

describe('PublicWelcomeSection', () => {
  it('renderiza o título e os parágrafos de boas-vindas, sem nenhum card', () => {
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
})
