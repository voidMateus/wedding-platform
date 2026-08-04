import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CoupleMonogram from '~/components/public/CoupleMonogram.vue'

describe('PublicCoupleMonogram', () => {
  it('renderiza as iniciais do casal', () => {
    const wrapper = mount(CoupleMonogram, { props: { coupleNames: 'Ana & João' } })
    expect(wrapper.text()).toBe('AJ')
  })

  it('é puramente decorativo (aria-hidden)', () => {
    const wrapper = mount(CoupleMonogram, { props: { coupleNames: 'Ana & João' } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('aplica a classe de tamanho correspondente à prop size', () => {
    const wrapper = mount(CoupleMonogram, { props: { coupleNames: 'Ana & João', size: 'lg' } })
    expect(wrapper.classes()).toContain('h-32')
    expect(wrapper.classes()).toContain('w-32')
  })

  it('usa o tamanho "md" por padrão', () => {
    const wrapper = mount(CoupleMonogram, { props: { coupleNames: 'Ana & João' } })
    expect(wrapper.classes()).toContain('h-20')
  })

  it('cai para o fallback de nomes fora do padrão "Nome & Nome"', () => {
    const wrapper = mount(CoupleMonogram, { props: { coupleNames: 'Família Silva' } })
    expect(wrapper.text()).toBe('FS')
  })

  it('usa as cores do tema (fill-primary) por padrão', () => {
    const wrapper = mount(CoupleMonogram, { props: { coupleNames: 'Ana & João' } })
    expect(wrapper.find('text').classes()).toContain('fill-primary')
  })

  it('usa branco (fill-white) quando inverted, para funcionar sobre foto de capa', () => {
    const wrapper = mount(CoupleMonogram, { props: { coupleNames: 'Ana & João', inverted: true } })
    expect(wrapper.find('text').classes()).toContain('fill-white')
    expect(wrapper.find('text').classes()).not.toContain('fill-primary')
  })
})
