import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { esperarHidratacao } from './support/hidratacao'

/**
 * Configurações tem catorze seções, e até a Fase E só havia um jeito de chegar
 * a elas: percorrer a coluna do menu, cuja ordem era a da CONSTRUÇÃO das telas
 * (rodada de usabilidade de 20/09/2026, ponto 22).
 *
 * Os dois caminhos novos são para os dois jeitos de procurar: quem sabe o nome
 * digita, quem não sabe olha. E a decisão foi não encolher a tela — esconder
 * metade das opções atrás de "avançado" troca um problema de tamanho por um de
 * descoberta.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('a busca do painel leva à seção de configuração pelo sinônimo', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)

  // A busca do cabeçalho só existe a partir de `xl`: abaixo disso ela
  // disputaria a largura com a nav primária, e quem está no celular tem o
  // índice de assuntos e o menu da seção.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/admin/${slug}`)

  const busca = page.getByPlaceholder(/Buscar convidado/).first()
  await expect(busca).toBeVisible({ timeout: 20_000 })

  // Sem isto o campo recebe "untdown": o HTML do SSR aceita a digitação antes
  // de o Vue ligar o v-model, e os primeiros caracteres se perdem.
  await esperarHidratacao(page)

  // "countdown" não aparece em lugar nenhum da tela: o nome do cartão é
  // "Experiência". É exatamente o caso que o relatório descreve.
  await busca.fill('countdown')

  const resultado = page.getByRole('link', { name: /Experiência/ })
  await expect(resultado).toBeVisible({ timeout: 20_000 })
  await resultado.click()

  await expect(page).toHaveURL(/\/configuracoes\?secao=experiencia$/)
  await expect(page.getByRole('heading', { name: 'Experiência' })).toBeVisible({ timeout: 20_000 })
})

test('o índice do topo leva ao assunto, e a ordem é a do uso', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/configuracoes`)

  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible({
    timeout: 20_000,
  })

  // Sem seção na URL a tela abre no primeiro assunto, que passou a ser o que
  // todo casal preenche primeiro.
  await expect(page.getByRole('heading', { name: 'O evento' }).first()).toBeVisible()

  // "Avançado" é o assunto que atravessa dois formulários: o item leva ao
  // cartão do tema, e o de Pagamentos leva ao do evento.
  await page.getByRole('link', { name: 'Avançado', exact: true }).first().click()

  await expect(page).toHaveURL(/\/configuracoes\?secao=avancado$/)
  await expect(page.getByRole('heading', { name: 'Opções avançadas' })).toBeVisible({
    timeout: 20_000,
  })

  // E o cartão do OUTRO formulário não vem junto — ele tem barra de salvamento
  // própria, e o endpoint de Configurações substitui a linha inteira.
  await expect(page.getByRole('heading', { name: 'Presentes e pagamentos' })).toBeHidden()
})
