import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Hero from '~/components/public/Hero.vue'
import Button from '~/components/ui/Button.vue'
import CountdownTimer from '~/components/ui/CountdownTimer.vue'
import type { EventSegment } from '~/types/event-segment'
import type { Wedding } from '~/types/wedding'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function makeWedding(overrides: Partial<Wedding> = {}): Wedding {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'ana-e-joao',
    couple_names: 'Ana & João',
    event_date: '2027-05-16',
    event_time: '20:30:00',
    child_max_age: 11,
    guest_list_mode: 'closed',
    rsvp_deadline: null,
    theme_config: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Wedding
}

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    wedding_id: '11111111-1111-1111-1111-111111111111',
    title: 'Cerimônia',
    venue_name: 'Igreja São José',
    venue_address: null,
    venue_latitude: null,
    venue_longitude: null,
    same_venue_as: null,
    starts_at: null,
    ends_at: null,
    display_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as EventSegment
}

function mountHero(props: Record<string, unknown>) {
  return mount(Hero, {
    props,
    global: {
      components: { UiButton: Button, UiCountdownTimer: CountdownTimer },
      stubs: {
        ...ICON_STUBS,
        NuxtImg: { template: '<img :src="src" :alt="alt" />', props: ['src', 'alt', 'sizes'] },
        NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to', 'target'] },
      },
    },
  })
}

const QUICK_LINK_HREFS = [
  '/ana-e-joao/#presentes',
  '/ana-e-joao/#confirmar-presenca',
  '/ana-e-joao/#cronograma',
  '/ana-e-joao/#manual-convidados',
]

describe('PublicHero', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T00:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('divide "Nome & Nome" em 3 linhas (nome / & / nome)', () => {
    const wrapper = mountHero({ wedding: makeWedding({ couple_names: 'Ana & João' }) })
    const spans = wrapper.findAll('h1 span')
    expect(spans.map((s) => s.text())).toEqual(['Ana', '&', 'João'])
  })

  it('usa fallback de uma linha só quando o nome não tem "&"', () => {
    const wrapper = mountHero({ wedding: makeWedding({ couple_names: 'Família Silva' }) })
    expect(wrapper.find('h1').text()).toBe('Família Silva')
    expect(wrapper.find('h1 span').exists()).toBe(false)
  })

  it('mostra o local do primeiro segmento com venue_name na linha da data', () => {
    const wrapper = mountHero({
      wedding: makeWedding(),
      segments: [makeSegment({ venue_name: null }), makeSegment({ venue_name: 'Buffet Casa das Pedras' })],
    })
    expect(wrapper.text()).toContain('Buffet Casa das Pedras')
  })

  it('não quebra quando nenhum segmento tem venue_name', () => {
    const wrapper = mountHero({ wedding: makeWedding(), segments: [makeSegment({ venue_name: null })] })
    expect(wrapper.text()).not.toContain('•')
  })

  it('mostra a contagem regressiva por padrão (showCountdown ausente = true)', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: {} }) })
    expect(wrapper.text()).toContain('dias')
  })

  it('esconde a contagem regressiva quando showCountdown=false', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: { showCountdown: false } }) })
    expect(wrapper.text()).not.toContain('dias')
  })

  it('repassa theme_config.countdownStyle para o CountdownTimer (sem foto de capa)', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: { countdownStyle: 'inline' } }) })
    expect(wrapper.findComponent(CountdownTimer).props('variant')).toBe('inline')
  })

  it('mostra o rótulo "Faltam" acima da contagem regressiva', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: {} }) })
    expect(wrapper.text()).toContain('Faltam')
  })

  it('renderiza os 4 atalhos de navegação (sem foto de capa)', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: {} }) })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    for (const href of QUICK_LINK_HREFS) {
      expect(hrefs).toContain(href)
    }
  })

  it('renderiza os mesmos 4 atalhos de navegação (com foto de capa)', () => {
    const wrapper = mountHero({
      wedding: makeWedding({ theme_config: { coverImageUrl: 'https://example.com/cover.jpg' } }),
    })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    for (const href of QUICK_LINK_HREFS) {
      expect(hrefs).toContain(href)
    }
  })

  it('com foto de capa, a foto nunca fica atrás do texto (layout em split, não overlay)', () => {
    const wrapper = mountHero({
      wedding: makeWedding({ theme_config: { coverImageUrl: 'https://example.com/cover.jpg' } }),
    })
    // A contagem nunca precisa de `inverted` neste layout — o conteúdo
    // sempre fica sobre bg-surface-elevated/bg-surface, nunca sobre a foto.
    expect(wrapper.findComponent(CountdownTimer).props('inverted')).toBeFalsy()
  })

  it('o atalho de presentes é o CTA primário (cor de destaque)', () => {
    const wrapper = mountHero({ wedding: makeWedding() })
    const presentesLink = wrapper.findAll('a').find((a) => a.attributes('href') === '/ana-e-joao/#presentes')
    expect(presentesLink?.classes()).toContain('bg-primary')
  })

  it('respeita a seleção customizada de atalhos do casal (theme_config.heroButtons)', () => {
    const wrapper = mountHero({
      wedding: makeWedding({ theme_config: { heroButtons: ['galeria', 'faq'], heroFeaturedButton: 'faq' } }),
    })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/ana-e-joao/#galeria')
    expect(hrefs).toContain('/ana-e-joao/#faq')
    expect(hrefs).not.toContain('/ana-e-joao/#presentes')

    const faqLink = wrapper.findAll('a').find((a) => a.attributes('href') === '/ana-e-joao/#faq')
    expect(faqLink?.classes()).toContain('bg-primary')
    const galeriaLink = wrapper.findAll('a').find((a) => a.attributes('href') === '/ana-e-joao/#galeria')
    expect(galeriaLink?.classes()).not.toContain('bg-primary')
  })

  it('não renderiza a linha de atalhos quando o casal desmarca todos', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: { heroButtons: [] } }) })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    for (const href of QUICK_LINK_HREFS) {
      expect(hrefs).not.toContain(href)
    }
  })

  it('renderiza o selo do casal (sem foto de capa)', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: {} }) })
    expect(wrapper.text()).toContain('AJ')
  })

  it('renderiza o selo do casal (com foto de capa)', () => {
    const wrapper = mountHero({
      wedding: makeWedding({ theme_config: { coverImageUrl: 'https://example.com/cover.jpg' } }),
    })
    expect(wrapper.text()).toContain('AJ')
  })

  it('a linha de data/local aparece mesmo com showCountdown=false', () => {
    const wrapper = mountHero({
      wedding: makeWedding({ theme_config: { showCountdown: false } }),
      segments: [makeSegment({ venue_name: 'Buffet Casa das Pedras' })],
    })
    expect(wrapper.text()).toContain('Buffet Casa das Pedras')
    expect(wrapper.findComponent(CountdownTimer).exists()).toBe(false)
  })

  it('não renderiza citação por padrão (theme_config.heroQuote ausente)', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: {} }) })
    expect(wrapper.find('blockquote').exists()).toBe(false)
  })

  it('renderiza a citação e a atribuição quando definidas', () => {
    const wrapper = mountHero({
      wedding: makeWedding({
        theme_config: {
          heroQuote: 'Assim, eles já não são dois, mas sim uma só carne.',
          heroQuoteAttribution: 'Mateus 19:6',
        },
      }),
    })
    expect(wrapper.text()).toContain('Assim, eles já não são dois, mas sim uma só carne.')
    expect(wrapper.text()).toContain('Mateus 19:6')
  })

  it('não renderiza a atribuição sem a citação', () => {
    const wrapper = mountHero({
      wedding: makeWedding({ theme_config: { heroQuoteAttribution: 'Mateus 19:6' } }),
    })
    expect(wrapper.find('blockquote').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Mateus 19:6')
  })
})
