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

  it('variant="inline" mostra números soltos com separadores verticais, sem caixas', () => {
    vi.setSystemTime(new Date('2026-12-10T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: { targetDateTime: new Date('2026-12-12T06:01:02').toISOString(), variant: 'inline' },
    })

    expect(wrapper.find('.rounded-lg.border').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="countdown-separator"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('dias')
  })

  it('mostra só as unidades escolhidas, na ordem da maior para a menor', () => {
    vi.setSystemTime(new Date('2026-01-01T10:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: {
        targetDateTime: new Date('2026-09-03T00:00:00').toISOString(),
        units: ['meses', 'dias', 'horas'],
        variant: 'inline',
      },
    })

    const text = wrapper.text()
    expect(text).toContain('meses')
    expect(text).toContain('14')
    expect(text).not.toContain('minutos')
    expect(text).not.toContain('segundos')
    expect(wrapper.findAll('[data-test="countdown-separator"]')).toHaveLength(2)
  })

  it('costura o vão de uma seleção com buraco em vez de engolir o tempo do meio', () => {
    vi.setSystemTime(new Date('2026-01-01T10:00:00'))
    const wrapper = mount(CountdownTimer, {
      // Sem os dias, "8 meses, 1 dia e 14 horas" viraria "08 : 14".
      props: {
        targetDateTime: new Date('2026-09-03T00:00:00').toISOString(),
        units: ['meses', 'horas'],
        variant: 'inline',
      },
    })

    expect(wrapper.text()).toContain('dia')
    expect(wrapper.findAll('[data-test="countdown-separator"]')).toHaveLength(2)
  })

  it('sem a prop `units`, mantém as quatro unidades de sempre', () => {
    vi.setSystemTime(new Date('2026-12-10T00:00:00'))
    const wrapper = mount(CountdownTimer, {
      props: { targetDateTime: new Date('2026-12-12T06:01:02').toISOString(), variant: 'inline' },
    })

    expect(wrapper.findAll('[data-test="countdown-separator"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('segundos')
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
