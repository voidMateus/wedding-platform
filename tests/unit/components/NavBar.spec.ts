import { DOMWrapper, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import NavBar from '~/components/public/NavBar.vue'
import Button from '~/components/ui/Button.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'

const SLUG = 'ana-e-joao'

// O drawer mobile vive em <Teleport to="body"> (escapa do backdrop-blur do
// header — ver comentário no próprio NavBar.vue), então não aparece em
// wrapper.find()/findAll(); precisa ser consultado direto no document.body.
// Como o Teleport sempre renderiza o drawer (só a classe translate-x muda
// com isMobileMenuOpen), cada mount deixa um `.w-64` órfão em body — por
// isso o unmount no afterEach é obrigatório, senão um teste vê o drawer do
// teste anterior.
let wrapper: ReturnType<typeof mount> | null = null

function mountNavBar(props: Record<string, unknown> = {}) {
  wrapper = mount(NavBar, {
    props: { slug: SLUG, ...props },
    global: {
      components: { UiButton: Button },
      stubs: { ...ICON_STUBS, NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } },
    },
  })
  return wrapper
}

function drawerEl(): HTMLElement {
  const el = document.body.querySelector<HTMLElement>('.w-64')
  if (!el) throw new Error('drawer não encontrado em document.body')
  return el
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('PublicNavBar', () => {
  it('usa coupleNames como marca quando informado', () => {
    const wrapper = mountNavBar({ coupleNames: 'Ana & João' })
    expect(wrapper.text()).toContain('Ana & João')
  })

  it('usa "MeuSiteCasamento" como fallback quando coupleNames é null/ausente', () => {
    const wrapper = mountNavBar({ coupleNames: null })
    expect(wrapper.text()).toContain('MeuSiteCasamento')
  })

  it('links de âncora usam caminho absoluto com o slug do casamento ("/{slug}/#id")', () => {
    const wrapper = mountNavBar()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain(`/${SLUG}/#historia`)
    expect(hrefs).toContain(`/${SLUG}/#grande-dia`)
    expect(hrefs).toContain(`/${SLUG}/#confirmar-presenca`)
    expect(hrefs).toContain(`/${SLUG}/#nossos-momentos`)
    expect(hrefs).toContain(`/${SLUG}/#manual-convidados`)
  })

  it('a ordem dos links casa com a ordem das seções na home', () => {
    const wrapper = mountNavBar()
    const hrefs = wrapper
      .findAll('a')
      .map((a) => a.attributes('href'))
      .filter((href) => href?.includes('#'))
    const order = ['#historia', '#grande-dia', '#manual-convidados', '#confirmar-presenca', '#nossos-momentos']
    const filtered = order.filter((anchor) => hrefs.some((href) => href?.endsWith(anchor)))
    expect(filtered).toEqual(order)
  })

  it('o CTA "Presentear" aponta para a página dedicada /{slug}/presentes', () => {
    const wrapper = mountNavBar()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain(`/${SLUG}/presentes`)
  })

  it('o CTA de /{slug}/presentes é um botão destacado em pill (cor primária), não um link de texto', () => {
    const wrapper = mountNavBar()
    const presentesLink = wrapper.findAll('a').find((a) => a.attributes('href') === `/${SLUG}/presentes`)
    expect(presentesLink?.classes()).toContain('bg-primary')
    expect(presentesLink?.classes()).toContain('rounded-full')
  })

  it('renderiza o CTA "Presentear" duas vezes (desktop + topo do drawer mobile, via Teleport)', () => {
    const wrapper = mountNavBar()
    const desktopLinks = wrapper.findAll('a').filter((a) => a.attributes('href') === `/${SLUG}/presentes`)
    const drawerLinks = [...document.body.querySelectorAll('a')].filter(
      (a) => a.getAttribute('href') === `/${SLUG}/presentes`,
    )
    expect(desktopLinks).toHaveLength(1)
    expect(drawerLinks).toHaveLength(1)
  })

  it('preserva ?code= no link de presentes quando a prop code é informada', () => {
    const wrapper = mountNavBar({ code: 'abc123' })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain(`/${SLUG}/presentes?code=abc123`)
  })

  it('destaca o link do menu que casa com o atalho em destaque do Hero', () => {
    const wrapper = mountNavBar({ featuredButtonId: 'confirmar-presenca' })
    const links = wrapper.findAll('a')
    const confirmarLink = links.find((a) => a.attributes('href') === `/${SLUG}/#confirmar-presenca`)
    const historiaLink = links.find((a) => a.attributes('href') === `/${SLUG}/#historia`)
    expect(confirmarLink?.classes()).toContain('text-primary')
    expect(historiaLink?.classes()).not.toContain('text-primary')
  })

  it('sem featuredButtonId, nenhum link de âncora fica destacado', () => {
    const wrapper = mountNavBar()
    const links = wrapper.findAll('a').filter((a) => a.attributes('href')?.includes('#'))
    for (const link of links) {
      expect(link.classes()).not.toContain('text-primary')
    }
  })

  it('menu mobile começa fechado (drawer fora da tela)', () => {
    mountNavBar()
    expect(drawerEl().classList.contains('translate-x-full')).toBe(true)
  })

  it('clicar no botão hambúrguer abre o menu mobile', async () => {
    const wrapper = mountNavBar()
    await wrapper.find('button').trigger('click')
    expect(drawerEl().classList.contains('translate-x-0')).toBe(true)
    expect(wrapper.find('button').attributes('aria-label')).toBe('Fechar menu')
  })

  it('clicar em um link do menu mobile fecha o drawer', async () => {
    const wrapper = mountNavBar()
    await wrapper.find('button').trigger('click')
    const drawerLink = new DOMWrapper(drawerEl().querySelector('a')!)
    await drawerLink.trigger('click')
    expect(drawerEl().classList.contains('translate-x-full')).toBe(true)
  })

  it('o drawer não fica preso na altura do header (bug do backdrop-blur/containing block)', () => {
    mountNavBar()
    const el = drawerEl()
    expect(el.className).toContain('inset-y-0')
    // Regressão real: o drawer é filho de <header> (com backdrop-blur), o
    // `fixed inset-y-0` resolvia contra a caixa do header em vez do
    // viewport. Fora do <header> no template (Teleport) garante isso.
    expect(el.closest('header')).toBeNull()
  })
})
