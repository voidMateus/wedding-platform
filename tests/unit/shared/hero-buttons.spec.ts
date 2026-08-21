import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HERO_BUTTONS,
  DEFAULT_HERO_FEATURED_BUTTON,
  HERO_BUTTON_CATALOG,
  findHeroButton,
  resolveHeroButtons,
} from '#shared/hero-buttons'

describe('HERO_BUTTON_CATALOG', () => {
  it('tem ids únicos', () => {
    const ids = HERO_BUTTON_CATALOG.map((button) => button.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('o default aponta só para ids existentes no catálogo', () => {
    for (const id of DEFAULT_HERO_BUTTONS) {
      expect(findHeroButton(id)).toBeDefined()
    }
    expect(findHeroButton(DEFAULT_HERO_FEATURED_BUTTON)).toBeDefined()
  })
})

describe('resolveHeroButtons', () => {
  it('usa o default quando não há seleção salva', () => {
    const result = resolveHeroButtons(undefined, undefined)
    expect(result.map((b) => b.id)).toEqual(DEFAULT_HERO_BUTTONS)
    expect(result.find((b) => b.featured)?.id).toBe(DEFAULT_HERO_FEATURED_BUTTON)
  })

  it('resolve a seleção customizada do casal, na ordem escolhida', () => {
    const result = resolveHeroButtons(['galeria', 'faq'], 'faq')
    expect(result.map((b) => b.id)).toEqual(['galeria', 'faq'])
    expect(result.find((b) => b.id === 'faq')?.featured).toBe(true)
    expect(result.find((b) => b.id === 'galeria')?.featured).toBe(false)
  })

  it('ignora ids desconhecidos sem quebrar', () => {
    const result = resolveHeroButtons(['galeria', 'não-existe'], 'galeria')
    expect(result.map((b) => b.id)).toEqual(['galeria'])
  })

  it('retorna lista vazia quando o casal desmarca todos os atalhos', () => {
    const result = resolveHeroButtons([], undefined)
    expect(result).toEqual([])
  })

  it('nenhum item fica featured quando heroFeaturedButton não corresponde a nenhum selecionado', () => {
    const result = resolveHeroButtons(['galeria'], 'faq')
    expect(result.every((b) => !b.featured)).toBe(true)
  })
})
