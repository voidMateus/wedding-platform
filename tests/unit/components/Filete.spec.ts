import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Filete from '~/components/ui/Filete.vue'

describe('UiFilete', () => {
  it('é decorativo (aria-hidden)', () => {
    const wrapper = mount(Filete)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('usa a orientação horizontal por padrão', () => {
    const wrapper = mount(Filete)
    expect(wrapper.classes()).toContain('w-full')
    expect(wrapper.classes()).toContain('h-px')
  })

  it('aplica as classes de orientação vertical quando pedido', () => {
    const wrapper = mount(Filete, { props: { orientation: 'vertical' } })
    expect(wrapper.classes()).toContain('w-px')
    expect(wrapper.classes()).not.toContain('w-full')
  })
})
