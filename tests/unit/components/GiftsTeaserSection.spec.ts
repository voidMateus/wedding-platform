import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GiftsTeaserSection from '~/components/public/GiftsTeaserSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import Button from '~/components/ui/Button.vue'

function mountSection() {
  return mount(GiftsTeaserSection, {
    global: {
      components: {
        UiSectionDivider: SectionDivider,
        PublicEditorialSection: EditorialSection,
        UiButton: Button,
      },
      stubs: { NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } },
    },
  })
}

describe('PublicGiftsTeaserSection', () => {
  it('usa o título "Lista de Presentes" e a âncora #presentes', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe('Lista de Presentes')
    expect(wrapper.find('#presentes').exists()).toBe(true)
  })

  it('link do CTA aponta para /presentes', () => {
    const wrapper = mountSection()
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/presentes')
  })
})
