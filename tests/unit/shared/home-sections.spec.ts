import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SECTION_ORDER,
  HOME_SECTION_CATALOG,
  findHomeSection,
  resolveHomeSectionOrder,
} from '#shared/home-sections'

describe('HOME_SECTION_CATALOG', () => {
  it('tem ids únicos', () => {
    const ids = HOME_SECTION_CATALOG.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo item tem rótulo e dica preenchidos (a lista de ordenação depende dos dois)', () => {
    for (const section of HOME_SECTION_CATALOG) {
      expect(section.label.length).toBeGreaterThan(0)
      expect(section.hint.length).toBeGreaterThan(0)
    }
  })

  it('não inclui o Hero — a capa não é reordenável', () => {
    expect(findHomeSection('hero')).toBeUndefined()
  })

  it('mantém as âncoras já usadas em menu e atalhos do Hero', () => {
    // Os ids são também os `id` das <section> no HTML. Renomear um aqui
    // quebraria silenciosamente os links de shared/hero-buttons.ts e do NavBar.
    for (const anchor of [
      'historia',
      'grande-dia',
      'dress-code',
      'manual-convidados',
      'confirmar-presenca',
      'presentes',
      'nossos-momentos',
      'faq',
    ]) {
      expect(findHomeSection(anchor)).toBeDefined()
    }
  })
})

describe('resolveHomeSectionOrder', () => {
  it('sem ordem salva, devolve a ordem padrão', () => {
    expect(resolveHomeSectionOrder(undefined)).toEqual(DEFAULT_SECTION_ORDER)
  })

  it('devolve uma cópia — mexer no resultado não corrompe a constante do módulo', () => {
    const resolved = resolveHomeSectionOrder(undefined)
    resolved.push('boas-vindas')
    expect(DEFAULT_SECTION_ORDER).not.toContain(undefined)
    expect(DEFAULT_SECTION_ORDER.length).toBe(HOME_SECTION_CATALOG.length)
  })

  it('respeita a ordem salva pelo casal', () => {
    const saved = ['faq', 'boas-vindas']
    const resolved = resolveHomeSectionOrder(saved)
    expect(resolved.slice(0, 2)).toEqual(['faq', 'boas-vindas'])
  })

  it('descarta id que não existe mais no catálogo', () => {
    const resolved = resolveHomeSectionOrder(['boas-vindas', 'secao-que-nao-existe'])
    expect(resolved).not.toContain('secao-que-nao-existe')
  })

  it('descarta repetição — uma seção nunca é desenhada duas vezes', () => {
    const resolved = resolveHomeSectionOrder(['faq', 'faq', 'boas-vindas'])
    expect(resolved.filter((id) => id === 'faq')).toHaveLength(1)
  })

  it('anexa no fim as seções ausentes da lista salva', () => {
    // O caso que motiva a função: o casal salvou a ordem antes de a seção
    // existir. Sem isso, ela nunca apareceria no site dele.
    const resolved = resolveHomeSectionOrder(['boas-vindas', 'faq'])
    expect(resolved).toHaveLength(HOME_SECTION_CATALOG.length)
    expect(resolved).toContain('versiculo')
    expect(resolved).toContain('manual-padrinhos')
    expect(resolved.slice(0, 2)).toEqual(['boas-vindas', 'faq'])
  })

  it('sempre devolve o catálogo inteiro, qualquer que seja a entrada', () => {
    for (const saved of [[], ['faq'], ['x', 'y'], [...DEFAULT_SECTION_ORDER].reverse()]) {
      expect(new Set(resolveHomeSectionOrder(saved))).toEqual(new Set(DEFAULT_SECTION_ORDER))
    }
  })
})
