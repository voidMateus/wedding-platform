import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SectionDivider from '~/components/ui/SectionDivider.vue'

describe('UiSectionDivider', () => {
  it('é puramente decorativo (aria-hidden)', () => {
    const wrapper = mount(SectionDivider)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('renderiza o ornamento linha-ponto-losango-ponto-linha', () => {
    const wrapper = mount(SectionDivider)
    const spans = wrapper.findAll('span')
    expect(spans).toHaveLength(5)
  })
})
