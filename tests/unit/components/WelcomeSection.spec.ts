import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WelcomeSection from '~/components/public/WelcomeSection.vue'
import { WELCOME_CONTENT } from '#shared/wedding-content'
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

function mountSection(wedding: Wedding = makeWedding()) {
  return mount(WelcomeSection, {
    props: { wedding },
    global: {
      stubs: {
        PublicHeroFlourish: { template: '<svg data-test="flourish" />' },
      },
    },
  })
}

describe('PublicWelcomeSection', () => {
  it('sem customização, renderiza o título e os parágrafos de boas-vindas padrão, sem nenhum card', () => {
    const wrapper = mountSection()
    expect(wrapper.find('h2').text()).toBe(WELCOME_CONTENT.title)
    for (const paragraph of WELCOME_CONTENT.paragraphs) {
      expect(wrapper.text()).toContain(paragraph)
    }
    expect(wrapper.find('.rounded-lg').exists()).toBe(false)
    expect(wrapper.find('.rounded-xl').exists()).toBe(false)
  })

  it('escreve a mensagem em serifada itálica — é fala do casal, não informação', () => {
    // O único bloco do site nesse tratamento (--font-serif em itálico grande),
    // e é o que separa a voz do casal do resto da página, que informa.
    const wrapper = mountSection()
    const paragrafo = wrapper.findAll('p').find((p) => p.classes().includes('font-serif'))
    expect(paragrafo).toBeDefined()
    expect(paragrafo!.classes()).toContain('italic')
  })

  it('assina com os primeiros nomes do casal', () => {
    const wrapper = mountSection(makeWedding({ nomes_noivos: 'Ana Maria & João Pedro' }))
    expect(wrapper.text()).toContain('Com carinho, Ana e João')
  })

  it('não assina quando o nome do casal foge do padrão "Nome1 & Nome2"', () => {
    // Sem os dois lados não há como separar os primeiros nomes, e uma
    // assinatura errada é pior que nenhuma.
    const wrapper = mountSection(makeWedding({ nomes_noivos: 'Casal de Teste' }))
    expect(wrapper.text()).not.toContain('Com carinho')
  })

  it('usa o título/mensagem customizados pelo casal quando presentes em config_conteudo', () => {
    const wrapper = mountSection(
      makeWedding({
        config_conteudo: { welcomeTitle: 'Bem-vindos!', welcomeMessage: 'Mensagem custom.' },
      }),
    )
    expect(wrapper.find('h2').text()).toBe('Bem-vindos!')
    expect(wrapper.text()).toContain('Mensagem custom.')
    expect(wrapper.text()).not.toContain(WELCOME_CONTENT.title)
  })
})
