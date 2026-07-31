import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CountdownSection from '~/components/public/CountdownSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import CountdownTimer from '~/components/ui/CountdownTimer.vue'
import type { Wedding } from '~/types/wedding'

function makeWedding(overrides: Partial<Wedding> = {}): Wedding {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'ana-e-joao',
    couple_names: 'Ana & João',
    event_date: '2027-05-16',
    event_time: '20:30:00',
    rsvp_mode: 'per_guest',
    rsvp_deadline: null,
    theme_config: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Wedding
}

function mountCountdownSection(wedding: Wedding) {
  return mount(CountdownSection, {
    props: { wedding },
    global: {
      components: {
        UiSectionDivider: SectionDivider,
        PublicEditorialSection: EditorialSection,
        UiCountdownTimer: CountdownTimer,
      },
    },
  })
}

describe('PublicCountdownSection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T00:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza a seção com âncora #contagem-regressiva quando showCountdown não está definido (default true)', () => {
    const wrapper = mountCountdownSection(makeWedding({ theme_config: {} }))
    expect(wrapper.find('#contagem-regressiva').exists()).toBe(true)
    expect(wrapper.text()).toContain('dias')
  })

  it('não renderiza nada quando showCountdown=false', () => {
    const wrapper = mountCountdownSection(makeWedding({ theme_config: { showCountdown: false } }))
    expect(wrapper.find('#contagem-regressiva').exists()).toBe(false)
    expect(wrapper.html()).toBe('<!--v-if-->')
  })

  it('usa o tone="accent" para se destacar como uma pausa na leitura', () => {
    const wrapper = mountCountdownSection(makeWedding())
    expect(wrapper.classes()).toContain('bg-secondary/10')
  })
})
