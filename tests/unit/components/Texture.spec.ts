import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Texture from '~/components/ui/Texture.vue'

describe('UiTexture', () => {
  it('é decorativo (aria-hidden) e absolutamente posicionado sobre o pai', () => {
    const wrapper = mount(Texture)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.classes()).toContain('absolute')
    expect(wrapper.classes()).toContain('inset-0')
  })
})
