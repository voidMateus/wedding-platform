import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RsvpTeaserSection from '~/components/public/RsvpTeaserSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'

function mountSection() {
  return mount(RsvpTeaserSection, {
    global: { components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection } },
  })
}

describe('PublicRsvpTeaserSection', () => {
  it('usa o título "Confirme sua Presença" e a âncora #confirmar-presenca', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe('Confirme sua Presença')
    expect(wrapper.find('#confirmar-presenca').exists()).toBe(true)
  })

  it('não renderiza nenhum formulário funcional (só texto explicativo)', () => {
    const wrapper = mountSection()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(false)
  })
})
