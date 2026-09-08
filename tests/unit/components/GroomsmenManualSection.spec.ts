import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GroomsmenManualSection from '~/components/public/GroomsmenManualSection.vue'
import ColorSwatches from '~/components/public/ColorSwatches.vue'
import DressCodeIllustration from '~/components/public/DressCodeIllustration.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'
import type { Wedding } from '~/types/wedding'

function makeWedding(config_conteudo: unknown): Wedding {
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
    config_conteudo,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as Wedding
}

function mountSection(config_conteudo: unknown = null) {
  return mount(GroomsmenManualSection, {
    props: { wedding: makeWedding(config_conteudo) },
    global: {
      components: {
        PublicEditorialSection: EditorialSection,
        PublicColorSwatches: ColorSwatches,
        PublicDressCodeIllustration: DressCodeIllustration,
        UiSectionDivider: SectionDivider,
      },
      stubs: ICON_STUBS,
    },
  })
}

describe('PublicGroomsmenManualSection', () => {
  it('não renderiza nada sem conteúdo — a maioria dos casamentos não tem manual de padrinhos', () => {
    expect(mountSection().find('section').exists()).toBe(false)
  })

  it('usa o título "Manual dos Padrinhos" e a âncora #manual-padrinhos', () => {
    const wrapper = mountSection({
      groomsmenManual: { intro: 'Obrigado por caminharem com a gente.' },
    })
    expect(wrapper.get('h2').text()).toBe('Manual dos Padrinhos')
    expect(wrapper.get('section').attributes('id')).toBe('manual-padrinhos')
  })

  it('renderiza só a introdução quando é o único campo preenchido', () => {
    const wrapper = mountSection({ groomsmenManual: { intro: 'Um recado especial.' } })
    expect(wrapper.text()).toContain('Um recado especial.')
    expect(wrapper.text()).not.toContain('Para eles')
    expect(wrapper.text()).not.toContain('Para elas')
    expect(wrapper.findComponent(ColorSwatches).exists()).toBe(false)
  })

  it('renderiza os dois cartões de traje quando ambos estão preenchidos', () => {
    const wrapper = mountSection({
      groomsmenManual: {
        attireGroomsmen: 'Terno preto, camisa branca.',
        attireBridesmaids: 'Vestido longo em vermelho escuro.',
      },
    })
    expect(wrapper.text()).toContain('Para eles')
    expect(wrapper.text()).toContain('Terno preto, camisa branca.')
    expect(wrapper.text()).toContain('Para elas')
    expect(wrapper.text()).toContain('Vestido longo em vermelho escuro.')
    expect(wrapper.findAll('article')).toHaveLength(2)
  })

  it('um cartão de traje sozinho ocupa a linha inteira, sem buraco ao lado', () => {
    const wrapper = mountSection({ groomsmenManual: { attireGroomsmen: 'Terno preto.' } })
    expect(wrapper.findAll('article')).toHaveLength(1)
    const grid = wrapper.findAll('div').find((div) => div.classes().includes('grid'))
    expect(grid?.classes()).not.toContain('sm:grid-cols-2')
  })

  it('renderiza a paleta de cores quando há amostras', () => {
    const wrapper = mountSection({
      groomsmenManual: {
        palette: [
          { name: 'Vinho', hex: '#8b0000' },
          { name: 'Dourado', hex: '#c8a56a' },
        ],
      },
    })
    expect(wrapper.text()).toContain('Paleta de cores')
    expect(wrapper.text()).toContain('Vinho')
    expect(wrapper.text()).toContain('Dourado')
  })

  it('a ilustração de traje só aparece quando há traje descrito', () => {
    const semTraje = mountSection({ groomsmenManual: { intro: 'Oi' } })
    expect(semTraje.findComponent(DressCodeIllustration).exists()).toBe(false)

    const comTraje = mountSection({ groomsmenManual: { attireGroomsmen: 'Terno preto.' } })
    expect(comTraje.findComponent(DressCodeIllustration).exists()).toBe(true)
  })
})

describe('PublicColorSwatches', () => {
  it('escreve o nome ao lado de cada bolinha — a cor sozinha não informa quem não a distingue', () => {
    const wrapper = mount(ColorSwatches, {
      props: {
        swatches: [
          { name: 'Vinho', hex: '#8b0000' },
          { name: 'Champanhe', hex: '#f7e7ce' },
        ],
      },
    })
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Vinho')
    expect(wrapper.text()).toContain('Champanhe')
  })

  it('pinta a bolinha com o hex do casal e a esconde do leitor de tela', () => {
    const wrapper = mount(ColorSwatches, {
      props: { swatches: [{ name: 'Vinho', hex: '#8b0000' }] },
    })
    const dot = wrapper.get('li span[aria-hidden="true"]')
    expect(dot.attributes('style')).toContain('#8b0000')
  })
})
