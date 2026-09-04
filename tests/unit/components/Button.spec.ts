import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Button from '~/components/ui/Button.vue'

describe('UiButton', () => {
  it('renderiza o conteúdo do slot', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Confirmar' },
    })

    expect(wrapper.text()).toBe('Confirmar')
  })

  it('aplica a classe da variante primária por padrão', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Confirmar' },
    })

    expect(wrapper.classes()).toContain('bg-primary')
  })

  it('aplica a classe da variante outline (borda sutil, fundo translúcido)', () => {
    const wrapper = mount(Button, {
      props: { variant: 'outline' },
      slots: { default: 'Confirmar presença' },
    })

    expect(wrapper.classes()).toContain('border')
    expect(wrapper.classes()).toContain('border-primary/25')
  })

  it('CTA em pill (rounded="full", default da plataforma inteira) ganha lift, rótulo uppercase tracked e, se primary, glow colorido', () => {
    const pill = mount(Button, { slots: { default: 'Confirmar' } })
    expect(pill.classes()).toContain('hover:scale-[1.03]')
    expect(pill.classes()).toContain('uppercase')
    expect(pill.classes()).toContain('shadow-glow-primary')

    const mdButton = mount(Button, { props: { rounded: 'md' }, slots: { default: 'Salvar' } })
    expect(mdButton.classes()).not.toContain('hover:scale-[1.03]')
    expect(mdButton.classes()).not.toContain('uppercase')
  })

  it('variante ghost mantém uma borda sutil sempre visível, não só no hover', () => {
    const wrapper = mount(Button, { props: { variant: 'ghost' }, slots: { default: 'Editar' } })
    expect(wrapper.classes()).toContain('border')
    expect(wrapper.classes()).toContain('border-border/60')
  })

  // A regra anterior era "no admin a pílula continua, só o lift some". Ela caiu
  // na Fase Admin Livro de Registro: pílula uppercase com glow vira ruído numa
  // tela com dezenas de botões, então o admin passou a ser retangular por
  // contexto — sem cada chamador precisar passar rounded="md".
  it('no contexto admin (ADMIN_UI_CONTEXT_KEY), o formato default vira retangular — sem pílula, uppercase ou glow', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Novo convidado' },
      global: { provide: { [ADMIN_UI_CONTEXT_KEY as symbol]: true } },
    })
    expect(wrapper.classes()).toContain('rounded-md')
    expect(wrapper.classes()).not.toContain('rounded-full')
    expect(wrapper.classes()).not.toContain('uppercase')
    expect(wrapper.classes()).not.toContain('shadow-glow-primary')
    expect(wrapper.classes()).not.toContain('hover:scale-[1.03]')
  })

  it('no contexto admin, rounded="full" explícito ainda entrega a pílula completa — mas sem o lift de hover', () => {
    const wrapper = mount(Button, {
      props: { rounded: 'full' as const },
      slots: { default: 'Confirmar' },
      global: { provide: { [ADMIN_UI_CONTEXT_KEY as symbol]: true } },
    })
    expect(wrapper.classes()).toContain('rounded-full')
    expect(wrapper.classes()).toContain('uppercase')
    expect(wrapper.classes()).toContain('shadow-glow-primary')
    expect(wrapper.classes()).not.toContain('hover:scale-[1.03]')
    expect(wrapper.classes()).toContain('active:scale-95')
  })

  it('fora do admin, o formato default continua sendo a pílula', () => {
    const wrapper = mount(Button, { slots: { default: 'Confirmar presença' } })
    expect(wrapper.classes()).toContain('rounded-full')
    expect(wrapper.classes()).toContain('uppercase')
  })

  it('fica desabilitado quando a prop disabled é verdadeira', () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
      slots: { default: 'Confirmar' },
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('renderiza como link (NuxtLink) quando a prop "to" é passada', () => {
    const wrapper = mount(Button, {
      props: { to: '/presentes' },
      slots: { default: 'Ver presentes' },
      global: { stubs: { NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } },
    })

    expect(wrapper.find('button').exists()).toBe(false)
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/presentes')
    expect(link.classes()).toContain('bg-primary')
  })

  it('aplica target="_blank" e rel="noopener noreferrer" em links externos', () => {
    const wrapper = mount(Button, {
      props: { to: 'https://maps.google.com/?q=1,2', target: '_blank' },
      slots: { default: 'Abrir no mapa' },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a :href="to" :target="target" :rel="rel"><slot /></a>',
            props: ['to', 'target', 'rel'],
          },
        },
      },
    })

    const link = wrapper.find('a')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })
})
