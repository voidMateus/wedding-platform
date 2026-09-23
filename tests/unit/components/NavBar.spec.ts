import { DOMWrapper, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import NavBar from '~/components/public/NavBar.vue'
import Button from '~/components/ui/Button.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'
import { HOME_SECTION_CATALOG } from '#shared/home-sections'

const SLUG = 'ana-e-joao'

// O drawer mobile vive em <Teleport to="body"> (escapa do backdrop-blur do
// header — ver comentário no próprio NavBar.vue), então não aparece em
// wrapper.find()/findAll(); precisa ser consultado direto no document.body.
// Como o Teleport sempre renderiza o drawer (só a classe translate-x muda
// com isMobileMenuOpen), cada mount deixa um `.w-64` órfão em body — por
// isso o unmount no afterEach é obrigatório, senão um teste vê o drawer do
// teste anterior.
let wrapper: ReturnType<typeof mount> | null = null

/**
 * Todas as seções ligadas — o estado de quem já montou o site.
 *
 * Desde a inversão para opt-in (docs/fase4-onboarding.md 3.2), a barra filtra
 * pelas seções LIGADAS: sem esta prop, um casamento recém-criado não tem
 * destino nenhum no menu, que é o comportamento correto e tem teste próprio.
 */
const TODAS_AS_SECOES = HOME_SECTION_CATALOG.map((secao) => secao.id)

function mountNavBar(props: Record<string, unknown> = {}) {
  wrapper = mount(NavBar, {
    props: { slug: SLUG, activeSections: TODAS_AS_SECOES, ...props },
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

  /**
   * Os destinos esperados são DERIVADOS do catálogo, nunca escritos à mão.
   *
   * Eles eram uma lista fixa aqui e outra dentro do NavBar — e as duas já
   * divergiam do catálogo, inclusive na ordem: o teste afirmava
   * `manual-convidados` antes de `rsvp`, e na home o RSVP vem primeiro. Um
   * teste que repete a lista que ele deveria verificar só confirma que alguém
   * copiou os dois lugares igual (rodada de usabilidade de 20/09/2026, ponto
   * 26).
   */
  function destinosEsperados(): string[] {
    return HOME_SECTION_CATALOG.filter((secao) => !secao.noMenu).map(
      (secao) => `/${SLUG}${secao.shortcutHref}`,
    )
  }

  /** O que a barra mostra como texto, sem o botão de destaque. */
  function hrefsDaBarra(wrapper: ReturnType<typeof mount>): string[] {
    return wrapper
      .findAll('a')
      .filter((a) => !a.classes().includes('bg-primary'))
      .map((a) => a.attributes('href') ?? '')
  }

  it('links usam caminho absoluto com o slug do casamento — âncoras ou rota real (/rsvp)', () => {
    const wrapper = mountNavBar()
    const hrefs = hrefsDaBarra(wrapper)

    // Todo link da barra é um destino real do catálogo, com o slug na frente.
    for (const href of hrefs.filter((href) => href !== `/${SLUG}`)) {
      expect(destinosEsperados()).toContain(href)
    }
    expect(hrefs).toContain(`/${SLUG}/#historia`)
    expect(hrefs).toContain(`/${SLUG}/rsvp`)
  })

  it('a ordem dos links casa com a ordem das seções na home', () => {
    const wrapper = mountNavBar()
    const hrefs = hrefsDaBarra(wrapper)

    const naBarra = destinosEsperados().filter((href) => hrefs.includes(href))
    const naOrdemDaBarra = hrefs.filter((href) => destinosEsperados().includes(href))
    expect(naOrdemDaBarra).toEqual(naBarra)
  })

  it('todo destino ligado tem caminho — o que não cabe na barra está no painel', () => {
    // A regra que faltava: presentes sumia da navegação inteira sempre que o
    // destaque do casal era outro, porque a barra tinha cinco entradas escritas
    // à mão e o painel repetia as mesmas cinco. Com o menu derivado, o painel
    // lista TUDO — e é ele que sustenta a promessa quando a barra enche.
    const wrapper = mountNavBar({ featuredButtonId: 'confirmar-presenca' })
    const noPainel = [...document.body.querySelectorAll('a')].map(
      (a) => a.getAttribute('href') ?? '',
    )
    const emQualquerLugar = new Set([...hrefsDaBarra(wrapper), ...noPainel])

    for (const destino of destinosEsperados()) {
      expect(emQualquerLugar.has(destino), `sem caminho para ${destino}`).toBe(true)
    }
  })

  it('a lista de presentes continua no menu mesmo quando o destaque é outro', () => {
    // O ponto 26, na forma exata em que foi relatado.
    const wrapper = mountNavBar({ featuredButtonId: 'confirmar-presenca' })
    const noPainel = [...document.body.querySelectorAll('a')].map(
      (a) => a.getAttribute('href') ?? '',
    )
    expect([...hrefsDaBarra(wrapper), ...noPainel]).toContain(`/${SLUG}/presentes`)
  })

  it('o CTA "Presentear" aponta para a página dedicada /{slug}/presentes', () => {
    const wrapper = mountNavBar()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain(`/${SLUG}/presentes`)
  })

  it('o CTA de /{slug}/presentes é um botão destacado em pill (cor primária), não um link de texto', () => {
    const wrapper = mountNavBar()
    const presentesLink = wrapper
      .findAll('a')
      .find((a) => a.attributes('href') === `/${SLUG}/presentes`)
    expect(presentesLink?.classes()).toContain('bg-primary')
    expect(presentesLink?.classes()).toContain('rounded-full')
  })

  it('renderiza o CTA "Presentear" duas vezes (desktop + topo do drawer mobile, via Teleport)', () => {
    const wrapper = mountNavBar()
    const desktopLinks = wrapper
      .findAll('a')
      .filter((a) => a.attributes('href') === `/${SLUG}/presentes`)
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

  it('o botão preenchido da barra é o atalho em destaque, não um destino fixo', () => {
    // Antes o botão era sempre "Presentear", o que contradizia a própria
    // configuração: o Hero obedecia ao destaque escolhido e a barra insistia
    // em presentes.
    const wrapper = mountNavBar({ featuredButtonId: 'confirmar-presenca' })
    const botao = wrapper.findAll('a').find((a) => a.classes().includes('bg-primary'))
    expect(botao?.attributes('href')).toBe(`/${SLUG}/rsvp`)
  })

  it('o destino em destaque não aparece duas vezes na mesma barra', () => {
    // Ele vira o botão; repeti-lo como link de texto ao lado é ruído.
    const wrapper = mountNavBar({ featuredButtonId: 'confirmar-presenca' })
    const paraRsvp = wrapper.findAll('a').filter((a) => a.attributes('href') === `/${SLUG}/rsvp`)
    expect(paraRsvp).toHaveLength(1)
  })

  it('sem featuredButtonId, o botão cai no destaque padrão do catálogo', () => {
    const wrapper = mountNavBar()
    const botao = wrapper.findAll('a').find((a) => a.classes().includes('bg-primary'))
    expect(botao?.attributes('href')).toBe(`/${SLUG}/presentes`)
  })

  it('nenhum link de texto do menu fica destacado', () => {
    const wrapper = mountNavBar()
    const destinos = destinosEsperados()
    const links = wrapper.findAll('a').filter((a) => destinos.includes(a.attributes('href') ?? ''))

    // Guarda contra passar por vacuidade: sem links encontrados, o laço abaixo
    // não verificaria nada.
    expect(links.length).toBeGreaterThan(3)
    for (const link of links) {
      // O destaque é o botão (bg-primary); nenhum link de TEXTO usa cor.
      if (link.classes().includes('bg-primary')) continue
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
