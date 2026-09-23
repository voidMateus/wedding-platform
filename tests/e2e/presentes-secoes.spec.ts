import { expect, test, type Page } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { esperarHidratacao } from './support/hidratacao'
import { createTestGift } from '../factories/gift'
import { createTestGiftContribution } from '../factories/gift-contribution'
import { createTestGiftPayment } from '../factories/gift-payment'

/**
 * Presentes deixou de ser uma tela só.
 *
 * O módulo acumulava numa página o acervo, o arrecadado, as falhas de pagamento
 * e as categorias — e era o único com menu primário e sem menu de seção
 * (rodada de usabilidade de 20/09/2026, ponto 21). Os três destinos seguem o
 * mesmo critério do Financeiro: o OBJETO, outro EIXO sobre ele, e o lado de
 * fora.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

/** O `sm:` do Tailwind: abaixo dele a linha empilha e a coluna deixa de existir. */
const MENOR_LARGURA_COM_COLUNA = 640

/**
 * O painel pelo título — e não `getByRole('table').first()`.
 *
 * A ordem dos painéis desta tela é uma decisão: as falhas de pagamento vêm
 * antes dos recortes de dinheiro, porque são a única coisa que pede ação. Um
 * teste que dependesse do índice da tabela estaria afirmando o contrário sem
 * dizer, e quebraria na primeira vez que a ordem mudasse de propósito.
 */
function painel(page: Page, titulo: string) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { level: 2, name: titulo }) })
}

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()

  const cota = await createTestGift(conta.admin, conta.casamentoId, {
    titulo: 'Lua de mel',
    e_presente_cota: true,
    valor_meta_centavos: 500000,
    valor_cota_centavos: 10000,
    preco_centavos: null,
    quantidade_disponivel: null,
  })

  // Contribuição é sempre paga online, então ela é dinheiro que entrou — é o
  // que a tela de Recebidos soma nos dois recortes.
  await createTestGiftContribution(conta.admin, conta.casamentoId, cota.id, {
    nome_contribuinte: 'Tia Lúcia',
    valor_centavos: 30000,
  })

  const fisico = await createTestGift(conta.admin, conta.casamentoId, {
    titulo: 'Jogo de panelas',
  })

  // O pagamento que falhou: era um contador sem destino no topo da lista.
  await createTestGiftPayment(conta.admin, conta.casamentoId, fisico.id, {
    status_pagamento: 'falhou',
    motivo_falha: 'cartão recusado',
    nome_presenteador: 'Primo Rui',
    valor_centavos: 10000,
  })

  // Um presente fora da lista, para "Como aparece no site" ter o que mostrar.
  await createTestGift(conta.admin, conta.casamentoId, {
    titulo: 'Presente desligado',
    esta_ativo: false,
  })
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('o menu de seção leva aos três destinos de Presentes', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)

  await page.setViewportSize({ width: MENOR_LARGURA_COM_COLUNA, height: 900 })
  await page.goto(`/admin/${slug}/presentes`)
  await expect(page.getByRole('heading', { level: 1, name: 'Presentes' })).toBeVisible({
    timeout: 20_000,
  })

  const menu = page.getByRole('navigation', { name: 'Seção atual' })
  await expect(menu).toBeVisible()

  // A medição é a mesma do ponto 11: `truncate` esconde o corte sem mudar o
  // DOM, então nenhuma asserção de texto o pegaria.
  const cortados = await menu.getByRole('link').evaluateAll((elementos) =>
    elementos
      .flatMap((el) => Array.from(el.querySelectorAll('span')))
      .filter((span) => span.scrollWidth > span.clientWidth)
      .map(
        (span) => `${span.textContent?.trim()} (${span.scrollWidth}px em ${span.clientWidth}px)`,
      ),
  )
  expect(cortados, `rótulos cortados a ${MENOR_LARGURA_COM_COLUNA}px`).toEqual([])

  await menu.getByRole('link', { name: 'Recebidos' }).click()
  await expect(page).toHaveURL(new RegExp(`/presentes/recebidos$`))
  await expect(page.getByRole('heading', { level: 1, name: 'O que já entrou' })).toBeVisible({
    timeout: 20_000,
  })

  await menu.getByRole('link', { name: 'No site' }).click()
  await expect(page).toHaveURL(new RegExp(`/presentes/site$`))
  await expect(page.getByRole('heading', { level: 1, name: 'Como aparece no site' })).toBeVisible({
    timeout: 20_000,
  })
})

test('Recebidos mostra o dinheiro nos dois recortes, e a falha com nome e motivo', async ({
  page,
}) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/presentes/recebidos`)

  await expect(page.getByRole('heading', { level: 1, name: 'O que já entrou' })).toBeVisible({
    timeout: 20_000,
  })

  // O total é o dinheiro confirmado — a contribuição entrou, o pagamento que
  // falhou não.
  await expect(page.getByText('Arrecadado online')).toBeVisible()

  await expect(painel(page, 'Por presente').getByText('Lua de mel')).toBeVisible()
  await expect(painel(page, 'Por quem presenteou').getByText('Tia Lúcia')).toBeVisible()

  // O que o contador solto do topo da lista não dava: de quem, e por quê.
  const falhas = painel(page, 'Pagamentos com falha')
  await expect(falhas.getByText('Primo Rui')).toBeVisible()
  await expect(falhas.getByText('cartão recusado')).toBeVisible()
  await expect(falhas.getByText('Jogo de panelas')).toBeVisible()
})

test('"Como aparece no site" mostra o que o convidado não vê, e devolve à lista', async ({
  page,
}) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/presentes/site`)

  await expect(page.getByRole('heading', { level: 1, name: 'Como aparece no site' })).toBeVisible({
    timeout: 20_000,
  })

  // As categorias saíram do modal da lista e vivem aqui, onde a ordem delas
  // significa alguma coisa.
  await expect(page.getByRole('heading', { name: 'Categorias' })).toBeVisible()

  const fora = page.getByText('Presente desligado')
  await expect(fora).toBeVisible()

  // A espera é pela INTERATIVIDADE, não pela pintura: o conteúdo vem pronto do
  // SSR, e um clique antes da hidratação não dispara requisição nenhuma — não
  // dá erro, simplesmente não acontece.
  await esperarHidratacao(page)

  await page.getByRole('button', { name: 'Devolver à lista' }).click()
  await expect(page.getByText('voltou para a lista')).toBeVisible({ timeout: 20_000 })
  await expect(fora).toBeHidden()
})
