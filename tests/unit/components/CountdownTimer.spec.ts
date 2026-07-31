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
})
