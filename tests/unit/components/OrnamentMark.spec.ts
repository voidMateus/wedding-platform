import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OrnamentMark from '~/components/ui/OrnamentMark.vue'

describe('UiOrnamentMark', () => {
  it('é decorativo (aria-hidden)', () => {
    const wrapper = mount(OrnamentMark)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('renderiza o losango vazado (rotacionado, sem preenchimento)', () => {
    const wrapper = mount(OrnamentMark)
    const mark = wrapper.find('span')
    expect(mark.classes()).toContain('rotate-45')
    expect(mark.classes()).not.toContain('bg-secondary')
  })
})
