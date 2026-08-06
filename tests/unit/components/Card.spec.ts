import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Card from '~/components/ui/Card.vue'

describe('UiCard', () => {
  it('renderiza o conteúdo do slot default', () => {
    const wrapper = mount(Card, {
      slots: { default: 'Conteúdo do card' },
    })

    expect(wrapper.text()).toContain('Conteúdo do card')
  })

  it('não renderiza a área de header/footer quando os slots não são usados', () => {
    const wrapper = mount(Card, {
      slots: { default: 'Conteúdo' },
    })

    expect(wrapper.text()).not.toContain('undefined')
    expect(wrapper.findAll('div').length).toBeGreaterThan(0)
  })

  it('renderiza header e footer quando os slots são passados', () => {
    const wrapper = mount(Card, {
      slots: {
        header: '<h2>Título</h2>',
        default: 'Corpo',
        footer: '<button>Ação</button>',
      },
    })

    expect(wrapper.text()).toContain('Título')
    expect(wrapper.text()).toContain('Corpo')
    expect(wrapper.text()).toContain('Ação')
  })

  it('aplica padding "md" por padrão', () => {
    const wrapper = mount(Card, {
      slots: { default: 'Conteúdo' },
    })

    expect(wrapper.classes()).toContain('p-4')
  })

  it('aplica padding customizado', () => {
    const wrapper = mount(Card, {
      props: { padding: 'none' },
      slots: { default: 'Conteúdo' },
    })

    expect(wrapper.classes()).not.toContain('p-4')
    expect(wrapper.classes()).not.toContain('p-3')
  })

  it('usa rounded-xl/shadow-xl por padrão (tratamento premium, plataforma inteira)', () => {
    const wrapper = mount(Card, { slots: { default: 'Conteúdo' } })
    expect(wrapper.classes()).toContain('rounded-xl')
    expect(wrapper.classes()).toContain('shadow-xl')
  })

  it('aplica o degrau reduzido (radius/elevation "lg"/"sm") quando pedido', () => {
    const wrapper = mount(Card, { props: { radius: 'lg', elevation: 'sm' }, slots: { default: 'Conteúdo' } })
    expect(wrapper.classes()).toContain('rounded-lg')
    expect(wrapper.classes()).toContain('shadow-sm')
  })

  it('variant "default" (padrão) não aplica hover nem destaque', () => {
    const wrapper = mount(Card, { slots: { default: 'Conteúdo' } })
    expect(wrapper.classes()).not.toContain('cursor-pointer')
    expect(wrapper.classes().some((c) => c.includes('bg-primary/'))).toBe(false)
  })

  it('variant "interactive" ganha hover no degrau médio da escala', () => {
    const wrapper = mount(Card, { props: { variant: 'interactive' }, slots: { default: 'Conteúdo' } })
    expect(wrapper.classes()).toContain('hover:shadow-md')
    expect(wrapper.classes()).toContain('cursor-pointer')
  })

  it('variant "highlight" aplica ênfase visual sutil na cor primária', () => {
    const wrapper = mount(Card, { props: { variant: 'highlight' }, slots: { default: 'Conteúdo' } })
    expect(wrapper.classes()).toContain('bg-primary/[0.03]')
    expect(wrapper.classes()).toContain('!border-primary/20')
  })
})
