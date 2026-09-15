import { expect, test } from '@playwright/test'
import {
  criarContaDeTeste,
  entrarComo,
  preencherHorario,
  type ContaDeTeste,
} from './support/conta-de-teste'
import { expectNoAccessibilityViolations } from './utils/a11y'

// O roteiro de Primeiros passos e o wizard, contra o Supabase de
// desenvolvimento real.
//
// O que estes testes protegem é a promessa que define a fase: nada é
// obrigatório, nada se perde, e nada do progresso mora no banco. Em especial o
// caminho que só um navegador percorre — pular uma etapa, sair no meio e
// voltar encontrando o que já tinha sido salvo, com a etapa certa aberta sem
// nenhuma "última etapa visitada" gravada em lugar nenhum.
//
// Auto-suficiente: cria o próprio casal, em RASCUNHO e sem convidado nenhum —
// o estado exato de quem acabou de receber o acesso, que é justamente o que
// estes testes descrevem. Antes dependia de E2E_ADMIN_EMAIL/PASSWORD, que
// nunca estiveram no `.env`: o arquivo inteiro pulava em silêncio.
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste({ status_ciclo_vida: 'rascunho' })
})

test.afterAll(async () => {
  await conta?.limpar()
})

const entrar = (page: import('@playwright/test').Page) => entrarComo(page, conta)

test.describe('onboarding — o roteiro e o wizard', () => {
  test('o Início nunca fica em branco, em nenhum estado', async ({ page }) => {
    const slug = await entrar(page)
    await page.goto(`/admin/${slug}`)

    // O modo acolhimento esconde os blocos de relatório contando que o roteiro
    // ocupe a tela — mas o roteiro SOME quando completa. Num casamento com os
    // quatro passos feitos e a lista ainda vazia, as duas regras se somavam e o
    // painel ficava literalmente em branco: publicar o site, que é o último
    // passo, apagava a tela inteira.
    //
    // A promessa guardada aqui vale para QUALQUER estado da conta de teste: ou
    // o Início mostra os Primeiros passos, ou mostra a contagem regressiva.
    const roteiro = page.getByRole('heading', { name: 'Primeiros passos' })
    const contagem = page.getByText('Faltam para o grande dia')

    await expect
      .poll(async () => (await roteiro.count()) + (await contagem.count()), {
        timeout: 20_000,
        message: 'o Início não desenhou nem o roteiro nem a contagem',
      })
      .toBeGreaterThan(0)

    // O Início de uma conta nova — a primeira tela que o casal vê, e a única
    // que todo mundo atravessa.
    await expectNoAccessibilityViolations(page, { rotulo: 'Início — roteiro de primeiros passos' })
  })

  test('o wizard abre na etapa pedida e salva ao avançar', async ({ page }) => {
    const slug = await entrar(page)

    // O roteiro leva DIRETO à etapa clicada, não ao começo: quem clicou em
    // "Onde vai ser" pediu aquilo, não um passeio pelas três.
    await page.goto(`/admin/${slug}/comecar?passo=local`)
    await expect(page.getByRole('heading', { name: 'Onde vai ser?' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Etapa 2 de 3')).toBeVisible()

    // Pular não salva e não trava: leva à etapa seguinte sem escrever nada.
    await expect(async () => {
      await page.getByRole('button', { name: 'Pular' }).click({ timeout: 3_000 })
      await expect(page).toHaveURL(/passo=aparencia/, { timeout: 5_000 })
    }).toPass({ timeout: 30_000 })

    await expect(page.getByRole('heading', { name: 'Escolham a cara do site' })).toBeVisible()

    // O wizard numa etapa com formulário desenhado e a barra de navegação
    // (Voltar/Pular/Continuar) presente.
    await expectNoAccessibilityViolations(page, { rotulo: 'Onboarding — etapa Aparência' })

    // Voltar mostra o que estava lá — a etapa pulada não sumiu do caminho.
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page).toHaveURL(/passo=local/, { timeout: 10_000 })
  })

  test('a última etapa termina no roteiro, nunca numa tela de parabéns', async ({ page }) => {
    const slug = await entrar(page)

    await page.goto(`/admin/${slug}/comecar?passo=aparencia`)
    await expect(page.getByRole('heading', { name: 'Escolham a cara do site' })).toBeVisible({
      timeout: 20_000,
    })

    // O botão da última etapa diz "Concluir" — é a única confirmação de
    // chegada que existe, e ela é uma palavra, não uma tela.
    await expect(page.getByRole('button', { name: 'Concluir' })).toBeVisible()

    await expect(async () => {
      await page.getByRole('button', { name: 'Pular' }).click({ timeout: 3_000 })
      await expect(page).toHaveURL(new RegExp(`/admin/${slug}$`), { timeout: 5_000 })
    }).toPass({ timeout: 30_000 })
  })

  test('a escolha de tema mostra a capa do site, não dois pontos de cor', async ({ page }) => {
    const slug = await entrar(page)

    await page.goto(`/admin/${slug}/comecar?passo=aparencia`)
    await expect(page.getByRole('heading', { name: 'Escolham a cara do site' })).toBeVisible({
      timeout: 20_000,
    })

    // Cada cartão é a capa com os nomes reais do casal, e a classe é o que
    // desfaz o escopo tipográfico do painel — sem ela os nove presets sairiam
    // na mesma fonte e no mesmo cinza.
    const previas = page.locator('.previa-do-site')
    await expect(previas.first()).toBeVisible()
    expect(await previas.count()).toBeGreaterThanOrEqual(5)
  })

  test('sair no meio não perde o que já foi salvo', async ({ page }) => {
    const slug = await entrar(page)

    await page.goto(`/admin/${slug}/comecar?passo=data-horario`)
    await expect(page.getByRole('heading', { name: 'Quando vai ser?' })).toBeVisible({
      timeout: 20_000,
    })

    await expect(async () => {
      await preencherHorario(page, '16:30')
      await page.getByRole('button', { name: 'Continuar' }).click({ timeout: 3_000 })
      await expect(page).toHaveURL(/passo=local/, { timeout: 8_000 })
    }).toPass({ timeout: 30_000 })

    // Sai no meio e volta: o valor veio do BANCO, não de estado de tela — e a
    // prova é o roteiro, que mostra o valor de cada passo cumprido. Asserir no
    // campo não serviria: o UiTimePicker é um TimeField de segmentos, sem um
    // `input value` para ler, e o seletor por rótulo resolve para um input
    // escondido do primitive (que sempre devolve string vazia).
    await page.goto(`/admin/${slug}`)
    await expect(page.getByRole('heading', { name: 'Primeiros passos' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('16:30')).toBeVisible({ timeout: 20_000 })

    // E o passo passa a contar como cumprido, sem nada ter sido marcado à mão.
    await expect(page.getByText(/1 de 4 conclu/)).toBeVisible()
  })
})
