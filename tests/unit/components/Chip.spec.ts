import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Chip from '~/components/ui/Chip.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'

describe('UiChip', () => {
  it('renderiza o label como texto estático por padrão', () => {
    const wrapper = mount(Chip, { props: { label: 'Cozinha' }, global: { stubs: ICON_STUBS } })
    expect(wrapper.text()).toContain('Cozinha')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('aplica o estado selecionado', () => {
    const wrapper = mount(Chip, {
      props: { label: 'Padrinhos', selected: true },
      global: { stubs: ICON_STUBS },
    })
    expect(wrapper.classes()).toContain('bg-primary')
  })

  it('quando clickable, o label vira um botão que emite "click"', async () => {
    const wrapper = mount(Chip, {
      props: { label: 'Padrinhos', clickable: true },
      global: { stubs: ICON_STUBS },
    })
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    await button.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('quando removable, mostra um botão de remover que emite "remove"', async () => {
    const wrapper = mount(Chip, {
      props: { label: 'Cozinha', removable: true },
      global: { stubs: ICON_STUBS },
    })
    const removeButton = wrapper.find('button[aria-label="Remover Cozinha"]')
    expect(removeButton.exists()).toBe(true)
    await removeButton.trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
