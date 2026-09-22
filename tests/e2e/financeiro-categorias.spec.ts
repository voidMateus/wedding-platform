import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { createTestBudgetCategory, createTestExpense } from '../factories/finance'
import { CATEGORIAS_ORCAMENTO_SUGERIDAS } from '#shared/orcamento-categorias'

/**
 * O planejamento por categoria — a tela onde o casal decide, item a item.
 *
 * O que ela promete comparar são os nomes DO NOSSO catálogo, e é por isso que
 * o corte deles não é detalhe de acabamento: "Cerimônia e assessoria" virava
 * "Cerimônia e asses…" numa lista que a plataforma mesma semeou (rodada de
 * usabilidade de 20/09/2026, ponto 11).
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

/** O `sm:` do Tailwind: abaixo dele a linha empilha e a coluna deixa de existir. */
const MENOR_LARGURA_COM_COLUNA = 640

let conta: ContaDeTeste
/** A primeira categoria do catálogo — onde o gasto do teste de exclusão mora. */
let primeiraCategoria: { id: string; nome: string }

test.beforeAll(async () => {
  conta = await criarContaDeTeste()

  // O catálogo inteiro, exatamente como o botão "Começar com as sugeridas" o
  // insere — é o nome mais longo dele que define a largura da coluna.
  const criadas = []
  for (const categoria of CATEGORIAS_ORCAMENTO_SUGERIDAS) {
    criadas.push(
      await createTestBudgetCategory(conta.admin, conta.casamentoId, {
        nome: categoria.nome,
        ordem_exibicao: categoria.ordemExibicao,
      }),
    )
  }
  primeiraCategoria = criadas[0]!
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('nenhum nome do catálogo de sugeridas é cortado na coluna', async ({ page }) => {
  test.setTimeout(90_000)

  const slug = await entrarComo(page, conta)

  await page.setViewportSize({ width: MENOR_LARGURA_COM_COLUNA, height: 900 })
  await page.goto(`/admin/${slug}/financeiro/categorias`)

  const nomes = page.getByTestId('nome-da-categoria')
  await expect(nomes.first()).toBeVisible({ timeout: 20_000 })
  await expect(nomes).toHaveCount(CATEGORIAS_ORCAMENTO_SUGERIDAS.length)

  // `scrollWidth > clientWidth` é o que o `truncate` esconde: o texto continua
  // lá, com as reticências por cima. Medir é a única forma de ver o corte —
  // ele não muda o DOM, e nenhuma asserção de texto o pega.
  const cortados = await nomes.evaluateAll((elementos) =>
    elementos
      .filter((el) => el.scrollWidth > el.clientWidth)
      .map((el) => `${el.textContent?.trim()} (${el.scrollWidth}px em ${el.clientWidth}px)`),
  )

  expect(cortados, `nomes cortados a ${MENOR_LARGURA_COM_COLUNA}px`).toEqual([])
})

test('o gasto se exclui da própria linha, e o toast desfaz', async ({ page }) => {
  test.setTimeout(90_000)

  const gasto = await createTestExpense(conta.admin, conta.casamentoId, {
    descricao: 'Gasto criado por engano',
    categoria_id: primeiraCategoria.id,
    valor_estimado_centavos: 150000,
  })

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/financeiro/categorias`)

  const linha = page
    .getByRole('button', { name: new RegExp(`^${primeiraCategoria.nome}`) })
    .first()
  await expect(linha).toBeVisible({ timeout: 20_000 })

  const campo = page.getByLabel(`Nome do gasto ${gasto.descricao}`)

  // A categoria abre na própria linha — é assim que o planejamento acontece.
  // `toPass` porque a página é renderizada no servidor e o botão existe antes de
  // o Vue hidratar: um clique nessa janela não aciona handler nenhum.
  await expect(async () => {
    await linha.click()
    await expect(campo).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  // --- excluir da própria linha, sem passar pela ficha ---
  await page.getByRole('button', { name: `Ações de ${gasto.descricao}` }).click()
  await page.getByRole('menuitem', { name: 'Excluir' }).click()

  // Gasto só planejado sai direto: a pergunta custaria mais que o gesto.
  await expect(campo).toBeHidden({ timeout: 20_000 })

  // --- e o caminho de volta é um clique ---
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(campo).toBeVisible({ timeout: 20_000 })
})
