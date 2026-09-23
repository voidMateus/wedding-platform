import { expect, test, type Page } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'

/**
 * A faixa entre o celular e o desktop largo — notebooks de 13", janelas não
 * maximizadas.
 *
 * O site público foi construído para os dois extremos, e o relatório descreve
 * "pouco ou quase nada" de adaptação no meio (rodada de usabilidade de
 * 20/09/2026, ponto 29). O painel corre o mesmo risco na largura em que o menu
 * de seção e o conteúdo disputam espaço.
 *
 * **O que se mede é ESTOURO**, não estética: conteúdo mais largo que a janela
 * é o defeito objetivo dessa faixa — ele produz rolagem horizontal, que é a
 * forma mais confiável de fazer alguém achar que a página está quebrada.
 * Julgamento de layout continua sendo trabalho humano; isto é a rede que
 * impede a regressão silenciosa.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

/** As quatro larguras do plano: 13", 13" HiDPI, o `xl` do Tailwind, e 1366. */
const LARGURAS = [1024, 1152, 1280, 1366] as const

let conta: ContaDeTeste

/**
 * As onze seções do catálogo, e um nome LONGO.
 *
 * As seções nascem desligadas (opt-in), então um casamento de teste padrão tem
 * só a capa — e uma varredura sobre uma capa não prova nada sobre o site. O
 * nome comprido é o pior caso real desta faixa: o `<h1>` da capa fixa 72px de
 * 640px em diante (medido: a tipografia do site tem UM degrau, em 640, e nada
 * muda de 768 até 1920), então é o nome que decide se ele cabe.
 */
const TODAS_AS_SECOES = [
  'boas-vindas',
  'versiculo',
  'historia',
  'grande-dia',
  'confirmar-presenca',
  'dress-code',
  'manual-convidados',
  'manual-padrinhos',
  'presentes',
  'nossos-momentos',
  'faq',
]

test.beforeAll(async () => {
  conta = await criarContaDeTeste({
    nomes_noivos: 'Maria Fernanda Albuquerque e João Guilherme Vasconcelos',
  })

  await conta.admin
    .from('casamentos')
    .update({
      status_ciclo_vida: 'publicado',
      config_tema: {
        activeSections: TODAS_AS_SECOES,
        sectionOrder: TODAS_AS_SECOES,
        showCountdown: true,
      },
    })
    .eq('id', conta.casamentoId)
})

test.afterAll(async () => {
  await conta?.limpar()
})

/**
 * Quem passa da janela.
 *
 * `documentElement.scrollWidth` maior que a janela é o sintoma; os elementos
 * que o causam são a informação útil — sem eles, o teste diz "quebrou" e deixa
 * quem for consertar procurando no escuro.
 */
async function estouroHorizontal(page: Page, largura: number) {
  return page.evaluate((limite) => {
    const raiz = document.documentElement
    if (raiz.scrollWidth <= limite) return { rolagem: 0, culpados: [] as string[] }

    const culpados = Array.from(document.body.querySelectorAll('*'))
      .filter((el) => {
        const caixa = el.getBoundingClientRect()
        // Margem de 1px: subpixel de borda/arredondamento não é estouro.
        return caixa.width > 0 && caixa.right > limite + 1
      })
      .slice(0, 5)
      .map((el) => {
        const caixa = el.getBoundingClientRect()
        const classe = el.className?.toString().slice(0, 50) ?? ''
        return `${el.tagName}.${classe} (termina em ${Math.round(caixa.right)}px)`
      })

    return { rolagem: raiz.scrollWidth - limite, culpados }
  }, largura)
}

test.describe('larguras intermediárias', () => {
  for (const largura of LARGURAS) {
    test(`o site público não estoura a ${largura}px`, async ({ page }) => {
      test.setTimeout(120_000)

      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto(`/${conta.slug}`)
      await page.waitForLoadState('networkidle')

      const { rolagem, culpados } = await estouroHorizontal(page, largura)
      expect(culpados, `estouro de ${rolagem}px a ${largura}px`).toEqual([])
    })

    test(`o painel não estoura a ${largura}px`, async ({ page }) => {
      test.setTimeout(120_000)

      const slug = await entrarComo(page, conta)
      await page.setViewportSize({ width: largura, height: 900 })

      // As telas com mais peso lado a lado: o menu de seção disputa largura com
      // uma tabela em Convidados e com a coluna de cartões em Configurações.
      for (const rota of ['', '/convidados', '/financeiro', '/configuracoes']) {
        await page.goto(`/admin/${slug}${rota}`)
        await page.waitForLoadState('networkidle')

        const { rolagem, culpados } = await estouroHorizontal(page, largura)
        expect(culpados, `estouro de ${rolagem}px em ${rota || '/'} a ${largura}px`).toEqual([])
      }
    })
  }
})
