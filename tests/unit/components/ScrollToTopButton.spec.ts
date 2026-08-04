import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScrollToTopButton from '~/components/public/ScrollToTopButton.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true })
}

describe('PublicScrollToTopButton', () => {
  afterEach(() => {
    setScrollY(0)
  })

  it('começa escondido no topo da página', () => {
    const wrapper = mount(ScrollToTopButton, { global: { stubs: ICON_STUBS } })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('aparece depois de rolar além do limiar', async () => {
    const wrapper = mount(ScrollToTopButton, { global: { stubs: ICON_STUBS } })
    setScrollY(600)
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').attributes('aria-label')).toBe('Voltar ao topo')
  })

  it('clicar rola a página de volta ao topo suavemente', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const wrapper = mount(ScrollToTopButton, { global: { stubs: ICON_STUBS } })
    setScrollY(600)
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    await wrapper.find('button').trigger('click')
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    scrollToSpy.mockRestore()
  })
})
