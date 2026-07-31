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

  it('renderiza como link (NuxtLink) quando a prop "to" é passada', () => {
    const wrapper = mount(Button, {
      props: { to: '/presentes' },
      slots: { default: 'Ver presentes' },
      global: { stubs: { NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } },
    })

    expect(wrapper.find('button').exists()).toBe(false)
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/presentes')
    expect(link.classes()).toContain('bg-primary')
  })
})
