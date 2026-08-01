import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StorySection from '~/components/public/StorySection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { STORY_CONTENT } from '#shared/wedding-content'
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

function mountStory(wedding: Wedding) {
  return mount(StorySection, {
    props: { wedding },
    global: {
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection },
      stubs: { NuxtImg: { template: '<img :src="src" :alt="alt" />', props: ['src', 'alt', 'sizes'] } },
    },
  })
}

describe('PublicStorySection', () => {
  it('renderiza todos os parágrafos do conteúdo fixo', () => {
    const wrapper = mountStory(makeWedding())
    for (const paragraph of STORY_CONTENT.paragraphs) {
      expect(wrapper.text()).toContain(paragraph)
    }
  })

  it('layout centralizado sem foto (nenhuma imagem renderizada)', () => {
    const wrapper = mountStory(makeWedding({ theme_config: {} }))
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('layout com foto quando storyImageUrl está definido, com alt descritivo', () => {
    const wrapper = mountStory(
      makeWedding({ theme_config: { storyImageUrl: 'https://example.com/story.jpg' } }),
    )
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('alt')).toBe('Foto de Ana & João')
  })

  it('ignora coverImageUrl — a foto da história é independente da foto de capa', () => {
    const wrapper = mountStory(
      makeWedding({ theme_config: { coverImageUrl: 'https://example.com/cover.jpg' } }),
    )
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('usa o título "Nossa História" e a âncora #historia', () => {
    const wrapper = mountStory(makeWedding())
    expect(wrapper.find('h2').text()).toBe('Nossa História')
    expect(wrapper.find('#historia').exists()).toBe(true)
  })
})
