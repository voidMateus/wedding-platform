import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import VerseSection from '~/components/public/VerseSection.vue'
import type { Wedding } from '~/types/wedding'

function makeWedding(overrides: Partial<Wedding> = {}): Wedding {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'ana-e-joao',
    nomes_noivos: 'Ana & João',
    data_evento: '2027-05-16',
    horario_evento: '20:30:00',
    modo_lista_convidados: 'fechada',
    modo_entrega_presente_fisico: 'ambos',
    status_ciclo_vida: 'publicado',
    prazo_rsvp: null,
    arquivado_em: null,
    handle_infinitepay: null,
    config_tema: {},
    config_conteudo: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Wedding
}

function mountSection(config_conteudo: unknown = null) {
  return mount(VerseSection, {
    props: { wedding: makeWedding({ config_conteudo } as Partial<Wedding>) },
  })
}

describe('PublicVerseSection', () => {
  it('não renderiza nada sem versículo — é assim que o casal remove a seção', () => {
    expect(mountSection().find('section').exists()).toBe(false)
  })

  it('não renderiza com apenas a referência preenchida', () => {
    const wrapper = mountSection({ verse: { reference: 'Salmos 118:24' } })
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('renderiza o texto entre aspas e a referência', () => {
    const wrapper = mountSection({
      verse: { text: 'Este é o dia que fez o Senhor.', reference: 'Salmos 118:24' },
    })
    expect(wrapper.text()).toContain('Este é o dia que fez o Senhor.')
    expect(wrapper.text()).toContain('Salmos 118:24')
  })

  it('renderiza só o texto quando não há referência', () => {
    const wrapper = mountSection({ verse: { text: 'Amar é caminhar junto.' } })
    expect(wrapper.text()).toContain('Amar é caminhar junto.')
    expect(wrapper.find('footer').exists()).toBe(false)
  })

  it('usa a faixa na cor primária com o texto em ornamento', () => {
    // O único lugar do site em que --color-ornament vira texto — e funciona
    // porque o fundo aqui é a primária escura, não o marfim da página.
    const wrapper = mountSection({ verse: { text: 'Algo' } })
    expect(wrapper.get('section').classes()).toContain('bg-primary')
    expect(wrapper.get('blockquote p').classes()).toContain('text-ornament')
  })

  it('usa <blockquote> — é uma citação, não um parágrafo qualquer', () => {
    const wrapper = mountSection({ verse: { text: 'Algo' } })
    expect(wrapper.find('blockquote').exists()).toBe(true)
  })
})
