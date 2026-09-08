import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SECTION_ORDER,
  HOME_SECTION_CATALOG,
  findHomeSection,
  resolveHomeSectionOrder,
  resolveHomeSections,
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

describe('resolveHomeSections — alternância de fundo', () => {
  const allVisible: Record<string, boolean> = {}

  it('nunca deixa duas seções claras seguidas com o mesmo fundo', () => {
    // A razão de o tom sair daqui e não de dentro de cada componente: com a
    // ordem nas mãos do casal, qualquer par pode acabar adjacente.
    const resolved = resolveHomeSections({
      order: undefined,
      hidden: undefined,
      hasContent: allVisible,
    })
    const alternantes = resolved.filter((s) => s.tone === 'default' || s.tone === 'muted')
    for (let i = 1; i < alternantes.length; i += 1) {
      expect(alternantes[i]!.tone).not.toBe(alternantes[i - 1]!.tone)
    }
  })

  /** Só as seções que se revezam, na ordem final — as de tom fixo ficam de fora. */
  function alternantes(resolved: ReturnType<typeof resolveHomeSections>) {
    return resolved.filter((s) => s.tone === 'default' || s.tone === 'muted')
  }

  it('continua alternando depois de uma seção sumir por falta de conteúdo', () => {
    // O caso que o tom fixo por componente errava: sem a seção do meio, as
    // vizinhas viram adjacentes e precisam de tons diferentes.
    const resolved = resolveHomeSections({
      order: undefined,
      hidden: undefined,
      hasContent: { 'manual-convidados': false },
    })
    expect(resolved.map((s) => s.id)).not.toContain('manual-convidados')
    const lista = alternantes(resolved)
    for (let i = 1; i < lista.length; i += 1) {
      expect(lista[i]!.tone).not.toBe(lista[i - 1]!.tone)
    }
  })

  it('continua alternando depois de uma seção ser desligada', () => {
    const resolved = resolveHomeSections({
      order: undefined,
      hidden: ['dress-code'],
      hasContent: allVisible,
    })
    expect(resolved.map((s) => s.id)).not.toContain('dress-code')
    const lista = alternantes(resolved)
    for (let i = 1; i < lista.length; i += 1) {
      expect(lista[i]!.tone).not.toBe(lista[i - 1]!.tone)
    }
  })

  it('Versículo e RSVP têm tom próprio e não entram no revezamento', () => {
    const resolved = resolveHomeSections({
      order: ['historia', 'versiculo', 'confirmar-presenca', 'dress-code'],
      hidden: undefined,
      hasContent: allVisible,
    })
    const byId = Object.fromEntries(resolved.map((s) => [s.id, s.tone]))
    expect(byId.versiculo).toBe('primary')
    expect(byId['confirmar-presenca']).toBe('accent')
    // As duas claras continuam se revezando apesar das faixas entre elas.
    expect(byId.historia).not.toBe(byId['dress-code'])
  })

  it('a primeira seção clara é sempre a mais clara', () => {
    const resolved = resolveHomeSections({
      order: ['versiculo', 'historia'],
      hidden: undefined,
      hasContent: allVisible,
    })
    expect(resolved.find((s) => s.id === 'historia')?.tone).toBe('default')
  })
})

describe('resolveHomeSections — visibilidade', () => {
  it('remove as seções desligadas pelo casal', () => {
    const resolved = resolveHomeSections({
      order: undefined,
      hidden: ['dress-code', 'faq'],
      hasContent: {},
    })
    const ids = resolved.map((s) => s.id)
    expect(ids).not.toContain('dress-code')
    expect(ids).not.toContain('faq')
    expect(ids).toContain('historia')
  })

  it('remove as seções sem conteúdo, mesmo ligadas', () => {
    const resolved = resolveHomeSections({
      order: undefined,
      hidden: [],
      hasContent: { versiculo: false, 'manual-padrinhos': false },
    })
    const ids = resolved.map((s) => s.id)
    expect(ids).not.toContain('versiculo')
    expect(ids).not.toContain('manual-padrinhos')
  })

  it('id ausente do mapa de conteúdo conta como "sempre tem o que mostrar"', () => {
    // Um mapa vazio não esconde nada: só quem responde `false` explicitamente
    // é removido. É o que permite listar ali apenas as seções que podem ficar
    // vazias, em vez de as onze.
    const resolved = resolveHomeSections({ order: undefined, hidden: [], hasContent: {} })
    expect(resolved).toHaveLength(HOME_SECTION_CATALOG.length)
  })

  it('desligar tudo devolve uma lista vazia sem quebrar', () => {
    const resolved = resolveHomeSections({
      order: undefined,
      hidden: [...DEFAULT_SECTION_ORDER],
      hasContent: {},
    })
    expect(resolved).toEqual([])
  })

  it('respeita a ordem do casal, não a do catálogo', () => {
    // `order` define a SEQUÊNCIA, nunca o conjunto: as seções não citadas
    // continuam entrando no fim (ver resolveHomeSectionOrder). Para restringir
    // o conjunto é `hidden` que serve.
    const resolved = resolveHomeSections({
      order: ['faq', 'historia'],
      hidden: [...DEFAULT_SECTION_ORDER].filter((id) => id !== 'faq' && id !== 'historia'),
      hasContent: {},
    })
    expect(resolved.map((s) => s.id)).toEqual(['faq', 'historia'])
  })

  it('uma ordem parcial não esconde as seções que ela não cita', () => {
    const resolved = resolveHomeSections({ order: ['faq'], hidden: [], hasContent: {} })
    expect(resolved[0]!.id).toBe('faq')
    expect(resolved).toHaveLength(HOME_SECTION_CATALOG.length)
  })
})
