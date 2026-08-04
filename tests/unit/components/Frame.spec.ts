import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Frame from '~/components/ui/Frame.vue'

describe('UiFrame', () => {
  it('renderiza o conteúdo do slot default', () => {
    const wrapper = mount(Frame, { slots: { default: '<p>Foto</p>' } })
    expect(wrapper.text()).toContain('Foto')
  })

  it('renderiza dois filetes decorativos concêntricos', () => {
    const wrapper = mount(Frame, { slots: { default: '<p>Foto</p>' } })
    const decorative = wrapper.findAll('[aria-hidden="true"]')
    expect(decorative).toHaveLength(2)
  })
})
