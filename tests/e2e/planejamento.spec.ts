import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'

// O Planejamento contra o Supabase de desenvolvimento real.
//
// O que estes testes protegem é a regra que organiza o módulo inteiro: o
// sistema sugere, o casal conclui. A sugestão sai do rodapé quando vira tarefa,
// a tarefa concluída muda de grupo sem sumir, e nada nasce no banco sem clique.
// Auto-suficiente: cria o próprio casal com `service_role` em vez de depender
// de E2E_ADMIN_EMAIL/PASSWORD — variáveis que nunca estiveram no `.env`, e que
// faziam este arquivo inteiro ser PULADO em silêncio (ver
// tests/e2e/support/conta-de-teste.ts).
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

async function entrar(page: import('@playwright/test').Page): Promise<string> {
  const slug = await entrarComo(page, conta)
  return slug
}

async function abrirPlanejamento(page: import('@playwright/test').Page, slug: string) {
  await page.goto(`/admin/${slug}/planejamento`)
  await expect(page.getByRole('heading', { level: 1, name: 'Planejamento' })).toBeVisible({
    timeout: 20_000,
  })
}

/** Cria uma tarefa pela linha de entrada do topo e devolve o título usado. */
async function criarTarefa(page: import('@playwright/test').Page, titulo: string) {
  const campo = page.getByLabel('Nova tarefa')
  await expect(campo).toBeVisible({ timeout: 20_000 })
  // `toPass` porque clique/digitação que chegam antes da hidratação são
  // descartados em silêncio — a mesma corrida das outras suítes do painel.
  await expect(async () => {
    await campo.fill(titulo, { timeout: 3_000 })
    await page.getByRole('button', { name: 'Adicionar' }).click({ timeout: 3_000 })
    await expect(page.getByRole('textbox', { name: `Tarefa ${titulo}` })).toBeVisible({
      timeout: 5_000,
    })
  }).toPass({ timeout: 30_000 })
  return titulo
}

async function excluirTarefa(page: import('@playwright/test').Page, titulo: string) {
  await expect(async () => {
    await page
      .getByRole('button', { name: `Ações de ${titulo}` })
      .first()
      .click({ timeout: 3_000 })
    await page.getByRole('menuitem', { name: 'Excluir' }).click({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.getByRole('textbox', { name: `Tarefa ${titulo}` })).toBeHidden({
    timeout: 15_000,
  })
}

test('tarefa criada sem prazo cai em "Sem prazo", e concluir a move para "Concluídas"', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)
  await abrirPlanejamento(page, slug)

  const titulo = `E2E prova do vestido ${Date.now()}`
  await criarTarefa(page, titulo)

  // Sem prazo é estado válido — a tarefa existe e não aparece como vencida. O
  // alvo é o CABEÇALHO do grupo, que traz a contagem junto — e a contagem não
  // entra no seletor porque o casamento de teste pode ter outras tarefas.
  await expect(page.getByRole('button', { name: /^Sem prazo/ })).toBeVisible()

  const linha = page.getByRole('textbox', { name: `Tarefa ${titulo}` })
  await expect(linha).toBeVisible()

  // Concluir: a tarefa sai do grupo e vai para "Concluídas", que nasce
  // recolhido — some da vista sem sumir do banco.
  await page.getByRole('checkbox', { name: `Concluir ${titulo}` }).check()
  const concluidas = page.getByRole('button', { name: /^Concluídas/ })
  await expect(concluidas).toBeVisible({ timeout: 15_000 })
  await expect(linha).toBeHidden({ timeout: 15_000 })

  await concluidas.click()
  await expect(linha).toBeVisible({ timeout: 15_000 })

  // Desconcluir devolve a tarefa ao grupo de origem: `concluida_em` é a única
  // fonte do estado, e ela volta a ser nula.
  await page.getByRole('checkbox', { name: `Concluir ${titulo}` }).uncheck()
  await expect(page.getByRole('button', { name: /^Sem prazo/ })).toBeVisible({ timeout: 15_000 })

  await excluirTarefa(page, titulo)
})

test('a sugestão vira tarefa num clique e some do rodapé — e volta quando a tarefa é excluída', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)
  await abrirPlanejamento(page, slug)

  // Uma sugestão qualquer que esteja oferecida agora: o catálogo é grande e o
  // que aparece depende dos fatos deste casamento, então o teste escolhe a
  // primeira da tela em vez de fixar uma chave que pode estar dispensada.
  const sugestao = page.getByRole('button', { name: /^\+ / }).first()
  await expect(sugestao).toBeVisible({ timeout: 20_000 })
  const rotulo =
    (await sugestao.textContent())
      ?.trim()
      .replace(/^\+\s*/, '')
      .trim() ?? ''
  expect(rotulo.length).toBeGreaterThan(0)

  await expect(async () => {
    await sugestao.click({ timeout: 3_000 })
    await expect(page.getByRole('textbox', { name: `Tarefa ${rotulo}` })).toBeVisible({
      timeout: 5_000,
    })
  }).toPass({ timeout: 30_000 })

  // A sugestão não é mais oferecida: ela virou linha, e oferecer de novo criaria
  // uma segunda tarefa igual.
  await expect(page.getByRole('button', { name: `+ ${rotulo}`, exact: true })).toBeHidden()

  // Excluir devolve a sugestão ao rodapé — a conta é determinística e não guarda
  // estado de "já ofereci isto".
  await excluirTarefa(page, rotulo)
  await expect(page.getByRole('button', { name: `+ ${rotulo}`, exact: true })).toBeVisible({
    timeout: 15_000,
  })
})

test('o painel mostra um número do módulo e leva até a tela', async ({ page }) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)
  await abrirPlanejamento(page, slug)

  const titulo = `E2E tarefa do painel ${Date.now()}`
  await criarTarefa(page, titulo)

  await page.goto(`/admin/${slug}`)
  const faixa = page.getByRole('link', { name: /ver no Planejamento/ })
  await expect(faixa).toBeVisible({ timeout: 20_000 })
  await faixa.click()
  await expect(page).toHaveURL(new RegExp(`/admin/${slug}/planejamento`))

  await abrirPlanejamento(page, slug)
  await excluirTarefa(page, titulo)
})
