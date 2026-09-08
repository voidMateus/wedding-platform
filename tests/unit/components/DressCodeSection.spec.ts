import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DressCodeSection from '~/components/public/DressCodeSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { DRESS_CODE_CONTENT } from '#shared/wedding-content'
import { ICON_STUBS } from '../test-utils/icon-stubs'
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

function mountDressCode(wedding: Wedding) {
  return mount(DressCodeSection, {
    props: { wedding },
    global: {
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection },
      stubs: {
        ...ICON_STUBS,
        NuxtImg: { template: '<img :src="src" :alt="alt" />', props: ['src', 'alt', 'sizes'] },
      },
    },
  })
}

describe('PublicDressCodeSection', () => {
  it('usa o título "Dress Code" e a âncora #dress-code', () => {
    const wrapper = mountDressCode(makeWedding())
    expect(wrapper.find('h2').text()).toBe('Dress Code')
    expect(wrapper.find('#dress-code').exists()).toBe(true)
  })

  it('não desenha imagem nenhuma por padrão', () => {
    // A ilustração da plataforma saiu: era a única arte do site que não vinha
    // do casal, e aparecia igual em todo casamento. Sem imagem enviada, a
    // seção é texto e cartões — como no protótipo do convite.
    const wrapper = mountDressCode(makeWedding())
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('mostra a imagem enviada pelo casal quando existe', () => {
    const wrapper = mountDressCode(
      makeWedding({ config_tema: { dressCodeImageUrl: 'https://exemplo.test/traje.jpg' } }),
    )
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://exemplo.test/traje.jpg')
    // Ilustrativa de verdade (mostra o traje), então tem alt descritivo — ao
    // contrário da capa do Hero, que é fundo-ambiente sob o texto.
    expect(img.attributes('alt')).toBeTruthy()
  })

  it('renderiza a descrição e todas as dicas', () => {
    const wrapper = mountDressCode(makeWedding())
    expect(wrapper.text()).toContain(DRESS_CODE_CONTENT.description)
    for (const tip of DRESS_CODE_CONTENT.suggestions) {
      expect(wrapper.text()).toContain(tip)
    }
  })

  it('cai nas cores default quando o tema não define paleta', () => {
    const wrapper = mountDressCode(makeWedding({ config_tema: {} }))
    expect(wrapper.html()).not.toContain('undefined')
  })

  it('usa descrição/sugestões customizadas pelo casal quando presentes em config_conteudo', () => {
    const wrapper = mountDressCode(
      makeWedding({
        config_conteudo: {
          dressCodeDescription: 'Traje esporte fino.',
          dressCodeSuggestions: ['Use tons pastel.'],
        },
      }),
    )
    expect(wrapper.text()).toContain('Traje esporte fino.')
    expect(wrapper.text()).toContain('Use tons pastel.')
    expect(wrapper.text()).not.toContain(DRESS_CODE_CONTENT.description)
  })

  it('esconde a lista de sugestões quando o casal esvazia config_conteudo.dressCodeSuggestions', () => {
    const wrapper = mountDressCode(makeWedding({ config_conteudo: { dressCodeSuggestions: [] } }))
    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
