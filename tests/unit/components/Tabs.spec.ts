import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Tabs from '~/components/ui/Tabs.vue'

const TAB_ITEMS = [
  { id: 'geral', label: 'Geral' },
  { id: 'aparencia', label: 'Aparência' },
]

function mountTabs(modelValue = 'geral') {
  return mount(Tabs, {
    props: { tabs: TAB_ITEMS, modelValue },
    slots: {
      geral: '<p>Conteúdo geral</p>',
      aparencia: '<p>Conteúdo aparência</p>',
    },
  })
}

describe('UiTabs', () => {
  it('renderiza um trigger por aba', () => {
    const wrapper = mountTabs()
    expect(wrapper.text()).toContain('Geral')
    expect(wrapper.text()).toContain('Aparência')
  })

  it('mostra o conteúdo da aba ativa (via modelValue)', () => {
    const wrapper = mountTabs('geral')
    expect(wrapper.text()).toContain('Conteúdo geral')
  })

  it('marca o trigger ativo com data-state="active"', () => {
    const wrapper = mountTabs('aparencia')
    const triggers = wrapper.findAll('[role="tab"]')
    const active = triggers.find((t) => t.text() === 'Aparência')
    expect(active?.attributes('data-state')).toBe('active')
  })

  it('clicar em outro trigger emite update:modelValue com o id da aba', async () => {
    const wrapper = mountTabs('geral')
    const triggers = wrapper.findAll('[role="tab"]')
    const aparenciaTrigger = triggers.find((t) => t.text() === 'Aparência')
    // TabsTrigger do reka-ui troca de aba no "mousedown", não no "click".
    await aparenciaTrigger?.trigger('mousedown', { button: 0 })

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['aparencia'])
  })
})
