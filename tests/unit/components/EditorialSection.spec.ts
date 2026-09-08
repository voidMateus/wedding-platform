import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { PUBLIC_ORNAMENT_FRAME_KEY } from '~/utils/public-theme-context'

function mountSection(props = {}, slots = {}) {
  return mount(EditorialSection, {
    props,
    slots,
    global: { components: { UiSectionDivider: SectionDivider } },
  })
}

describe('PublicEditorialSection', () => {
  it('renderiza o conteúdo do slot default', () => {
    const wrapper = mountSection({}, { default: '<p>Conteúdo da seção</p>' })
    expect(wrapper.text()).toContain('Conteúdo da seção')
  })

  it('não renderiza título/divisor quando title não é passado', () => {
    const wrapper = mountSection({}, { default: '<p>Conteúdo</p>' })
    expect(wrapper.find('h2').exists()).toBe(false)
  })

  it('renderiza o título e o divisor quando title é passado', () => {
    const wrapper = mountSection({ title: 'Nossa História' })
    expect(wrapper.find('h2').text()).toBe('Nossa História')
    expect(wrapper.findComponent(SectionDivider).exists()).toBe(true)
  })

  it('esconde o divisor quando divider=false', () => {
    const wrapper = mountSection({ title: 'Dress Code', divider: false })
    expect(wrapper.findComponent(SectionDivider).exists()).toBe(false)
  })

  it('renderiza a costura curva no topo quando não há moldura', () => {
    expect(mountSection({}).find('svg path').exists()).toBe(true)
  })

  it('aplica bg-surface-muted quando tone="muted"', () => {
    const wrapper = mountSection({ tone: 'muted' })
    expect(wrapper.classes()).toContain('bg-surface-muted')
  })

  it('aplica bg-surface por padrão', () => {
    const wrapper = mountSection({})
    expect(wrapper.classes()).toContain('bg-surface')
  })

  it('aplica a banda de destaque sólida (color-mix da secundária) quando tone="accent"', () => {
    const wrapper = mountSection({ tone: 'accent' })
    expect(wrapper.classes().some((c) => c.includes('color-mix'))).toBe(true)
  })

  it('propaga o id para a tag <section> (âncora de navegação)', () => {
    const wrapper = mountSection({ id: 'historia' })
    expect(wrapper.attributes('id')).toBe('historia')
  })

  it('renderiza o eyebrow acima do título quando informado', () => {
    const wrapper = mountSection({ title: 'Confirme sua Presença', eyebrow: 'R.S.V.P' })
    expect(wrapper.text()).toContain('R.S.V.P')
  })

  it('não renderiza eyebrow quando não informado', () => {
    const wrapper = mountSection({ title: 'Dress Code' })
    expect(wrapper.text()).not.toContain('undefined')
    expect(wrapper.findAll('p').some((p) => p.classes().includes('tracking-[0.3em]'))).toBe(false)
  })
})

describe('PublicEditorialSection — moldura de filete', () => {
  it('sem provider, não desenha moldura (default do inject)', () => {
    // O contrato que mantém as ~20 suítes de seção montáveis sem Pinia nem
    // layout: a seção desenha normalmente quando ninguém proveu nada.
    const wrapper = mountSection({ title: 'Nossa História' })
    expect(wrapper.classes()).not.toContain('ornament-frame')
  })

  it('desenha a moldura quando o layout provê ornamentFrame', () => {
    const wrapper = mount(EditorialSection, {
      props: { title: 'Nossa História' },
      global: {
        components: { UiSectionDivider: SectionDivider },
        provide: { [PUBLIC_ORNAMENT_FRAME_KEY as symbol]: () => true },
      },
    })
    expect(wrapper.classes()).toContain('ornament-frame')
  })

  it('a moldura substitui a costura — as duas juntas se cortavam', () => {
    // A curva diz "as seções escorrem uma na outra"; a moldura diz "cada seção
    // é uma página do convite". Desenhadas juntas, a onda passava por cima da
    // borda e o retângulo cortava a onda no meio (achado do usuário).
    const wrapper = mount(EditorialSection, {
      props: { title: 'Nossa História' },
      global: {
        components: { UiSectionDivider: SectionDivider },
        provide: { [PUBLIC_ORNAMENT_FRAME_KEY as symbol]: () => true },
      },
    })
    expect(wrapper.classes()).toContain('ornament-frame')
    expect(wrapper.find('svg path').exists()).toBe(false)
  })

  it('aceita um valor cru, não só um getter', () => {
    const wrapper = mount(EditorialSection, {
      props: { title: 'Nossa História' },
      global: {
        components: { UiSectionDivider: SectionDivider },
        provide: { [PUBLIC_ORNAMENT_FRAME_KEY as symbol]: true },
      },
    })
    expect(wrapper.classes()).toContain('ornament-frame')
  })
})
