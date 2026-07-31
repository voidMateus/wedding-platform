import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Hero from '~/components/public/Hero.vue'
import Button from '~/components/ui/Button.vue'
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

function mountHero(wedding: Wedding) {
  return mount(Hero, {
    props: { wedding },
    global: {
      components: { UiButton: Button },
      stubs: {
        NuxtImg: { template: '<img :src="src" :alt="alt" />', props: ['src', 'alt', 'sizes'] },
        NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to', 'target'] },
      },
    },
  })
}

const QUICK_LINK_HREFS = ['/presentes', '/#confirmar-presenca', '/#cronograma', '/#manual-convidados']

describe('PublicHero', () => {
  it('sem foto de capa: renderiza os 4 atalhos de navegação', () => {
    const wrapper = mountHero(makeWedding({ theme_config: {} }))
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    for (const href of QUICK_LINK_HREFS) {
      expect(hrefs).toContain(href)
    }
  })

  it('com foto de capa: renderiza os mesmos 4 atalhos de navegação', () => {
    const wrapper = mountHero(
      makeWedding({ theme_config: { coverImageUrl: 'https://example.com/cover.jpg' } }),
    )
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    for (const href of QUICK_LINK_HREFS) {
      expect(hrefs).toContain(href)
    }
  })

  it('o atalho de presentes é o CTA primário (cor de destaque)', () => {
    const wrapper = mountHero(makeWedding())
    const presentesLink = wrapper.findAll('a').find((a) => a.attributes('href') === '/presentes')
    expect(presentesLink?.classes()).toContain('bg-primary')
  })
})
