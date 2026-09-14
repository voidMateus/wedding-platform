import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HERO_BUTTONS,
  DEFAULT_HERO_FEATURED_BUTTON,
  HERO_BUTTON_CATALOG,
  findHeroButton,
  normalizeHeroButtonId,
  resolveHeroButtons,
} from '#shared/hero-buttons'
import { HOME_SECTION_CATALOG } from '#shared/home-sections'

describe('HERO_BUTTON_CATALOG', () => {
  it('tem ids únicos', () => {
    const ids = HERO_BUTTON_CATALOG.map((button) => button.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('oferece um atalho para TODA seção da home', () => {
    // O motivo de o catálogo ser derivado: enquanto eram duas listas escritas
    // à mão, três seções não tinham como ser alcançadas pelo Hero e nada
    // acusava a falta.
    expect(HERO_BUTTON_CATALOG.map((button) => button.id)).toEqual(
      HOME_SECTION_CATALOG.map((section) => section.id),
    )
  })

  it('todo atalho tem rótulo, ícone e destino', () => {
    for (const button of HERO_BUTTON_CATALOG) {
      expect(button.label.length).toBeGreaterThan(0)
      expect(button.icon).toMatch(/^lucide:/)
      expect(button.href.startsWith('/')).toBe(true)
    }
  })

  it('o default aponta só para ids existentes no catálogo', () => {
    for (const id of DEFAULT_HERO_BUTTONS) {
      expect(findHeroButton(id)).toBeDefined()
    }
    expect(findHeroButton(DEFAULT_HERO_FEATURED_BUTTON)).toBeDefined()
  })
})

describe('normalizeHeroButtonId', () => {
  it('traduz os ids anteriores à unificação com o catálogo de seções', () => {
    expect(normalizeHeroButtonId('cronograma')).toBe('grande-dia')
    expect(normalizeHeroButtonId('galeria')).toBe('nossos-momentos')
  })

  it('deixa passar um id que já é de seção', () => {
    expect(normalizeHeroButtonId('faq')).toBe('faq')
  })
})

describe('resolveHeroButtons', () => {
  /**
   * Todas as seções ligadas — o estado de quem já montou o site.
   *
   * Desde a inversão para opt-in (docs/fase4-onboarding.md 3.2) este argumento
   * deixou de ser "o que está escondido" e passou a ser "o que está ligado",
   * então omiti-lo significa NENHUM atalho, não todos.
   */
  const todasAtivas = HOME_SECTION_CATALOG.map((secao) => secao.id)

  it('usa o default quando não há seleção salva', () => {
    const result = resolveHeroButtons(undefined, undefined, todasAtivas)
    expect(result.map((b) => b.id)).toEqual(DEFAULT_HERO_BUTTONS)
    expect(result.find((b) => b.featured)?.id).toBe(DEFAULT_HERO_FEATURED_BUTTON)
  })

  it('resolve a seleção customizada do casal, na ordem escolhida', () => {
    const result = resolveHeroButtons(['nossos-momentos', 'faq'], 'faq', todasAtivas)
    expect(result.map((b) => b.id)).toEqual(['nossos-momentos', 'faq'])
    expect(result.find((b) => b.id === 'faq')?.featured).toBe(true)
    expect(result.find((b) => b.id === 'nossos-momentos')?.featured).toBe(false)
  })

  it('uma seleção salva com os ids antigos continua valendo', () => {
    // Sem a normalização o casal perderia os dois atalhos em silêncio, porque
    // id desconhecido é (corretamente) descartado.
    const result = resolveHeroButtons(['cronograma', 'galeria'], 'cronograma', todasAtivas)
    expect(result.map((b) => b.id)).toEqual(['grande-dia', 'nossos-momentos'])
    expect(result.find((b) => b.id === 'grande-dia')?.featured).toBe(true)
  })

  it('ignora ids desconhecidos sem quebrar', () => {
    const result = resolveHeroButtons(
      ['nossos-momentos', 'não-existe'],
      'nossos-momentos',
      todasAtivas,
    )
    expect(result.map((b) => b.id)).toEqual(['nossos-momentos'])
  })

  it('não oferece atalho para seção desligada — seria um link para lugar nenhum', () => {
    const result = resolveHeroButtons(
      ['presentes', 'dress-code', 'faq'],
      'presentes',
      todasAtivas.filter((id) => id !== 'dress-code'),
    )
    expect(result.map((b) => b.id)).toEqual(['presentes', 'faq'])
  })

  it('sem nenhuma seção ligada não há atalho — o site de um casal novo', () => {
    // Antes da inversão, `[]` significava "nada escondido" e devolvia tudo.
    // Agora significa "nada ligado", e o Hero de um casamento recém-criado é
    // só nomes, data e contagem.
    expect(resolveHeroButtons(['presentes', 'faq'], 'presentes', [])).toEqual([])
    expect(resolveHeroButtons(undefined, undefined)).toEqual([])
  })

  it('retorna lista vazia quando o casal desmarca todos os atalhos', () => {
    const result = resolveHeroButtons([], undefined, todasAtivas)
    expect(result).toEqual([])
  })

  it('nenhum item fica featured quando heroFeaturedButton não corresponde a nenhum selecionado', () => {
    const result = resolveHeroButtons(['nossos-momentos'], 'faq', todasAtivas)
    expect(result.every((b) => !b.featured)).toBe(true)
  })
})
