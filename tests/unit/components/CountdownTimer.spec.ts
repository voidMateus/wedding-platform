import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CountdownTimer from '~/components/ui/CountdownTimer.vue'

describe('UiCountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra dias/horas/minutos/segundos restantes até a data-alvo', () => {
    vi.setSystemTime(new Date('2026-12-10T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: { targetDateTime: new Date('2026-12-12T06:01:02').toISOString() },
    })

    const text = wrapper.text()
    expect(text).toContain('02')
    expect(text).toContain('dias')
    expect(text).toContain('06')
    expect(text).toContain('horas')
    expect(text).toContain('01')
    expect(text).toContain('min')
  })

  it('mostra o slot "past" quando a data-alvo já passou', () => {
    vi.setSystemTime(new Date('2026-12-13T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: { targetDateTime: new Date('2026-12-12T00:00:00').toISOString() },
      slots: { past: '<p>Já aconteceu!</p>' },
    })

    expect(wrapper.text()).toContain('Já aconteceu!')
    expect(wrapper.text()).not.toContain('dias')
  })

  it('usa o slot "past" default quando nenhum é fornecido', () => {
    vi.setSystemTime(new Date('2026-12-13T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: { targetDateTime: new Date('2026-12-12T00:00:00').toISOString() },
    })

    expect(wrapper.text()).toContain('O grande dia chegou!')
  })

  it('variant="cards" (default) renderiza uma caixa com borda por unidade', () => {
    vi.setSystemTime(new Date('2026-12-10T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: { targetDateTime: new Date('2026-12-12T06:01:02').toISOString() },
    })

    expect(wrapper.findAll('.border-border.bg-surface')).toHaveLength(4)
  })

  it('variant="inline" não renderiza caixas nem separador — só números e rótulos espaçados', () => {
    vi.setSystemTime(new Date('2026-12-10T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: { targetDateTime: new Date('2026-12-12T06:01:02').toISOString(), variant: 'inline' },
    })

    expect(wrapper.find('.border-border.bg-surface').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('·')
    expect(wrapper.text()).toContain('dias')
  })

  it('variant="inline" usa texto branco quando inverted (sobre foto de capa)', () => {
    vi.setSystemTime(new Date('2026-12-10T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: {
        targetDateTime: new Date('2026-12-12T06:01:02').toISOString(),
        variant: 'inline',
        inverted: true,
      },
    })

    expect(wrapper.find('.text-white').exists()).toBe(true)
    expect(wrapper.find('.text-primary').exists()).toBe(false)
  })

  it('variant="inline" usa as cores do tema (números em primary, rótulos em secondary) quando não invertido', () => {
    vi.setSystemTime(new Date('2026-12-10T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: { targetDateTime: new Date('2026-12-12T06:01:02').toISOString(), variant: 'inline' },
    })

    expect(wrapper.find('.text-primary').exists()).toBe(true)
    expect(wrapper.find('.text-secondary').exists()).toBe(true)
    expect(wrapper.find('.text-white').exists()).toBe(false)
  })
})
