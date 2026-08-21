import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GrandeDiaSection from '~/components/public/GrandeDiaSection.vue'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import type { EventSegment } from '~/types/event-segment'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function makeSegment(overrides: Partial<EventSegment> = {}): EventSegment {
  return {
    id: 'seg-1',
    casamento_id: '11111111-1111-1111-1111-111111111111',
    titulo: 'Cerimônia',
    nome_local: 'Igreja São José',
    endereco_local: 'Rua das Flores, 100',
    inicia_em: null,
    termina_em: null,
    ordem_exibicao: 0,
    latitude_local: null,
    longitude_local: null,
    mesmo_local_que: null,
    url_imagem: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mountSection(groups: EventSegment[][]) {
  return mount(GrandeDiaSection, {
    props: { groups, eventDate: '2027-05-16' },
    global: {
      components: { UiSectionDivider: SectionDivider, PublicEditorialSection: EditorialSection },
      stubs: {
        ...ICON_STUBS,
        PublicEventSpotlight: { template: '<div data-test="spotlight-card" />' },
        PublicSaveTheDateCard: { template: '<div data-test="save-the-date" />' },
      },
    },
  })
}

describe('PublicGrandeDiaSection', () => {
  it('usa sempre o título fixo "O Grande Dia" e a âncora #grande-dia', () => {
    const wrapper = mountSection([[makeSegment({ id: 'a', titulo: 'Cerimônia' })]])
    expect(wrapper.find('h2').text()).toBe('O Grande Dia')
    expect(wrapper.find('#grande-dia').exists()).toBe(true)
  })

  it('não renderiza nada quando não há grupos', () => {
    const wrapper = mountSection([])
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('renderiza um cartão por grupo (endereços diferentes → dois cartões)', () => {
    const wrapper = mountSection([
      [makeSegment({ id: 'a', titulo: 'Cerimônia' })],
      [makeSegment({ id: 'b', titulo: 'Recepção' })],
    ])
    expect(wrapper.findAll('[data-test="spotlight-card"]')).toHaveLength(2)
  })

  it('renderiza o cartão "save the date" dentro da própria seção', () => {
    const wrapper = mountSection([[makeSegment({ id: 'a', titulo: 'Cerimônia' })]])
    expect(wrapper.find('[data-test="save-the-date"]').exists()).toBe(true)
  })

  it('renderiza um único cartão quando os segmentos já vêm fundidos no mesmo grupo', () => {
    const wrapper = mountSection([
      [makeSegment({ id: 'a', titulo: 'Cerimônia' }), makeSegment({ id: 'b', titulo: 'Recepção', mesmo_local_que: 'a' })],
    ])
    expect(wrapper.findAll('[data-test="spotlight-card"]')).toHaveLength(1)
  })
})
