import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EditorialSection from '~/components/public/EditorialSection.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'

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

  it('renderiza a costura curva no topo por padrão e a esconde com seam=false', () => {
    const withSeam = mountSection({})
    expect(withSeam.find('svg path').exists()).toBe(true)

    const withoutSeam = mountSection({ seam: false })
    expect(withoutSeam.find('svg').exists()).toBe(false)
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
