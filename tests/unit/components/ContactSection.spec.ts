import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContactSection from '~/components/public/ContactSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { CONTACT_CONTENT } from '#shared/wedding-content'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function mountSection() {
  return mount(ContactSection, {
    global: {
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection },
      stubs: ICON_STUBS,
    },
  })
}

describe('PublicContactSection', () => {
  it('usa o título "Contato" e a âncora #contato', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe('Contato')
    expect(wrapper.find('#contato').exists()).toBe(true)
  })

  it('link de e-mail usa mailto: com o endereço correto', () => {
    const wrapper = mountSection()
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe(`mailto:${CONTACT_CONTENT.email}`)
    expect(link.text()).toContain(CONTACT_CONTENT.email)
  })
})
