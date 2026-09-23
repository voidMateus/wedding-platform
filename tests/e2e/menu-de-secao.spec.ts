import { expect, test, type Page } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'

/**
 * Nenhum rótulo do menu da seção pode ser cortado — em módulo nenhum.
 *
 * É o ponto 11 da rodada de usabilidade de 20/09/2026, e ele voltou duas vezes
 * depois de "resolvido": primeiro no rótulo "Planejar por categoria", criado
 * por quem tinha acabado de consertar o corte, e depois em Configurações, onde
 * a Fase E renomeou seções sem medir nenhuma ("Avisos automátic…",
 * "Classificação etá…", "Presentes e pag…").
 *
 * Voltou porque a régua que existia era do FINANCEIRO, e um módulo de cada vez
 * não é régua. Esta varre os quatro menus que existem.
 *
 * **E ela roda em largura de desktop.** A anterior media a 640px, onde a coluna
 * nem existe: ali o menu é a fileira rolável do celular, que não tem `truncate`
 * nenhum — o `scrollWidth` empata com o `clientWidth` e o teste passava
 * sempre, medindo o elemento errado. Daí a asserção de que o que se mediu
 * realmente carrega a classe que corta: uma régua que não pode falhar não é
 * uma régua.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

/** `lg` do Tailwind — abaixo dele a coluna dá lugar à fileira do celular. */
const MENOR_LARGURA_COM_COLUNA = 1024

const MODULOS = ['convidados', 'financeiro', 'presentes', 'configuracoes'] as const

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()
})

test.afterAll(async () => {
  await conta?.limpar()
})

async function rotulosCortados(page: Page) {
  const menu = page.getByRole('navigation', { name: 'Seção atual' })
  await expect(menu).toBeVisible({ timeout: 20_000 })

  return menu.locator('a span').evaluateAll((spans) => {
    const comCorte = spans.filter((span) => span.classList.contains('truncate'))

    return {
      medidos: comCorte.length,
      cortados: comCorte
        .filter((span) => span.scrollWidth > span.clientWidth)
        .map(
          (span) => `${span.textContent?.trim()} (${span.scrollWidth}px em ${span.clientWidth}px)`,
        ),
    }
  })
}

test.describe('rótulos do menu da seção', () => {
  for (const modulo of MODULOS) {
    test(`nenhum rótulo de ${modulo} é cortado na coluna`, async ({ page }) => {
      test.setTimeout(120_000)

      const slug = await entrarComo(page, conta)

      await page.setViewportSize({ width: MENOR_LARGURA_COM_COLUNA, height: 900 })
      await page.goto(`/admin/${slug}/${modulo}`)

      const { medidos, cortados } = await rotulosCortados(page)

      // Sem isto o teste vira decoração: medir zero rótulo passa igual a medir
      // todos e não achar corte nenhum.
      expect(medidos, `nenhum rótulo com truncate em ${modulo}`).toBeGreaterThan(0)
      expect(cortados, `rótulos cortados em ${modulo} a ${MENOR_LARGURA_COM_COLUNA}px`).toEqual([])
    })
  }
})
