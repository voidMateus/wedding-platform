import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Button from '~/components/ui/Button.vue'

describe('UiButton', () => {
  it('renderiza o conteúdo do slot', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Confirmar' },
    })

    expect(wrapper.text()).toBe('Confirmar')
  })

  it('aplica a classe da variante primária por padrão', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Confirmar' },
    })

    expect(wrapper.classes()).toContain('bg-primary')
  })

  it('fica desabilitado quando a prop disabled é verdadeira', () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
      slots: { default: 'Confirmar' },
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
