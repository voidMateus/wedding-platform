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
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('esconde o divisor quando divider=false', () => {
    const wrapper = mountSection({ title: 'Dress Code', divider: false })
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false)
  })

  it('aplica bg-surface-muted quando tone="muted"', () => {
    const wrapper = mountSection({ tone: 'muted' })
    expect(wrapper.classes()).toContain('bg-surface-muted')
  })

  it('aplica bg-surface por padrão', () => {
    const wrapper = mountSection({})
    expect(wrapper.classes()).toContain('bg-surface')
  })

  it('propaga o id para a tag <section> (âncora de navegação)', () => {
    const wrapper = mountSection({ id: 'historia' })
    expect(wrapper.attributes('id')).toBe('historia')
  })
})
