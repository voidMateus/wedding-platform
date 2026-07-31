import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NavBar from '~/components/public/NavBar.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function mountNavBar(props = {}) {
  return mount(NavBar, {
    props,
    global: {
      stubs: { ...ICON_STUBS, NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } },
    },
  })
}

describe('PublicNavBar', () => {
  it('usa coupleNames como marca quando informado', () => {
    const wrapper = mountNavBar({ coupleNames: 'Ana & João' })
    expect(wrapper.text()).toContain('Ana & João')
  })

  it('usa "Wedding Platform" como fallback quando coupleNames é null/ausente', () => {
    const wrapper = mountNavBar({ coupleNames: null })
    expect(wrapper.text()).toContain('Wedding Platform')
  })

  it('links de âncora usam caminho absoluto ("/#id"), não só "#id"', () => {
    const wrapper = mountNavBar()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/#historia')
    expect(hrefs).toContain('/#confirmar-presenca')
    expect(hrefs).toContain('/#galeria')
    expect(hrefs).toContain('/#contato')
  })

  it('inclui o link real para /presentes (não uma âncora)', () => {
    const wrapper = mountNavBar()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/presentes')
  })

  it('menu mobile começa fechado (drawer fora da tela)', () => {
    const wrapper = mountNavBar()
    const drawer = wrapper.findAll('div').find((d) => d.classes().includes('translate-x-full'))
    expect(drawer).toBeTruthy()
  })

  it('clicar no botão hambúrguer abre o menu mobile', async () => {
    const wrapper = mountNavBar()
    await wrapper.find('button').trigger('click')
    const drawer = wrapper.findAll('div').find((d) => d.classes().includes('translate-x-0'))
    expect(drawer).toBeTruthy()
    expect(wrapper.find('button').attributes('aria-label')).toBe('Fechar menu')
  })

  it('clicar em um link do menu mobile fecha o drawer', async () => {
    const wrapper = mountNavBar()
    await wrapper.find('button').trigger('click')
    const drawer = wrapper.find('div.w-64')
    await drawer.find('a').trigger('click')
    expect(wrapper.find('div.w-64').classes()).toContain('translate-x-full')
  })
})
