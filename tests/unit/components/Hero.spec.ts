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
    image_url: null,
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
        PublicHeroFlourish: { template: '<svg data-test="hero-flourish" />' },
      },
    },
  })
}

const QUICK_LINK_HREFS = [
  '/ana-e-joao/presentes',
  '/ana-e-joao/rsvp',
  '/ana-e-joao/#grande-dia',
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

  it('renderiza os 4 atalhos de navegação (sem foto de capa)', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: {} }) })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    for (const href of QUICK_LINK_HREFS) {
      expect(hrefs).toContain(href)
    }
  })

  it('com foto de capa, a foto vira fundo-ambiente sob véu e o texto mantém as cores do tema', () => {
    const wrapper = mountHero({
      wedding: makeWedding({ theme_config: { coverImageUrl: 'https://example.com/cover.jpg' } }),
    })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    for (const href of QUICK_LINK_HREFS) {
      expect(hrefs).toContain(href)
    }
    // Layout único (Rodada 8): nunca mais texto branco flutuando na foto crua.
    const img = wrapper.find('img')
    expect(img.classes()).toContain('opacity-20')
    expect(wrapper.find('h1').classes()).toContain('text-heading')
  })

  it('o atalho de presentes é o CTA primário (cor de destaque)', () => {
    const wrapper = mountHero({ wedding: makeWedding() })
    const presentesLink = wrapper.findAll('a').find((a) => a.attributes('href') === '/ana-e-joao/presentes')
    expect(presentesLink?.classes()).toContain('bg-primary')
  })

  it('preserva ?code= só no atalho de presentes (navegação real), não nas âncoras/rotas', () => {
    const wrapper = mountHero({ wedding: makeWedding(), code: 'abc123' })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/ana-e-joao/presentes?code=abc123')
    expect(hrefs).toContain('/ana-e-joao/rsvp')
    expect(hrefs).not.toContain('/ana-e-joao/rsvp?code=abc123')
  })

  it('o atalho de confirmar presença vai direto pra busca de RSVP (/rsvp), não pra âncora da home', () => {
    const wrapper = mountHero({ wedding: makeWedding() })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/ana-e-joao/rsvp')
    expect(hrefs).not.toContain('/ana-e-joao/#confirmar-presenca')
  })

  it('respeita a seleção customizada de atalhos do casal (theme_config.heroButtons)', () => {
    const wrapper = mountHero({
      wedding: makeWedding({ theme_config: { heroButtons: ['galeria', 'faq'], heroFeaturedButton: 'faq' } }),
    })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/ana-e-joao/#nossos-momentos')
    expect(hrefs).toContain('/ana-e-joao/#faq')
    expect(hrefs).not.toContain('/ana-e-joao/presentes')

    const faqLink = wrapper.findAll('a').find((a) => a.attributes('href') === '/ana-e-joao/#faq')
    expect(faqLink?.classes()).toContain('bg-primary')
    const galeriaLink = wrapper.findAll('a').find((a) => a.attributes('href') === '/ana-e-joao/#nossos-momentos')
    expect(galeriaLink?.classes()).not.toContain('bg-primary')
  })

  it('não renderiza a linha de atalhos quando o casal desmarca todos', () => {
    const wrapper = mountHero({ wedding: makeWedding({ theme_config: { heroButtons: [] } }) })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    for (const href of QUICK_LINK_HREFS) {
      expect(hrefs).not.toContain(href)
    }
  })

  it('mostra o monograma d\'água com as iniciais quando o nome segue o padrão "Nome & Nome"', () => {
    const wrapper = mountHero({ wedding: makeWedding({ couple_names: 'Ana & João' }) })
    const monogram = wrapper.find('[data-test="hero-monogram"]')
    expect(monogram.exists()).toBe(true)
    expect(monogram.text()).toContain('A')
    expect(monogram.text()).toContain('J')
  })

  it('não mostra monograma quando o nome não segue o padrão "Nome & Nome"', () => {
    const wrapper = mountHero({ wedding: makeWedding({ couple_names: 'Família Silva' }) })
    expect(wrapper.find('[data-test="hero-monogram"]').exists()).toBe(false)
  })

  it('renderiza o ornamento decorativo e a onda de transição', () => {
    const wrapper = mountHero({ wedding: makeWedding() })
    expect(wrapper.find('[data-test="hero-flourish"]').exists()).toBe(true)
    expect(wrapper.find('svg path').exists()).toBe(true)
  })
})
