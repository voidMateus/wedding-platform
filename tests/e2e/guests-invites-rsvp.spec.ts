import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { expectNoAccessibilityViolations } from './utils/a11y'

// Requer um usuário real já vinculado como wedding_member (mesma condição
// de login.spec.ts) — valida o fluxo ponta a ponta da reestruturação de
// Convidados/Acompanhantes/Convites/RSVP (CLAUDE.md, seção 12.1) contra o
// Supabase de desenvolvimento real.
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

async function login(page: import('@playwright/test').Page): Promise<string> {
  const adminSlug = await entrarComo(page, conta)
  return adminSlug
}

test('cadastro de convidado com acompanhante cria convite, e RSVP por busca funciona ponta a ponta', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const suffix = Date.now().toString().slice(-8)
  const primaryName = `Zeteste${suffix} Principal`
  const companionName = `Zeteste${suffix} Acompanhante`

  const adminSlug = await login(page)

  // --- cadastro com acompanhante + criação automática de convite ---
  // O cadastro é um modal sobre a listagem, aberto pela própria URL (`?novo=1`),
  // e é uma tela só: sem "Próximo" nem passo de revisão.
  await page.goto(`/admin/${adminSlug}/convidados?novo=1`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
  await page.getByLabel('Nome completo').fill(primaryName)

  // O rascunho de acompanhante abre SÓ com a busca: o nome digitado ali procura
  // na lista, e os campos só aparecem depois de "incluir nova pessoa". Este
  // nome é único, então a busca cai no estado "não achei ninguém".
  await page.getByRole('button', { name: 'Adicionar acompanhante' }).click()
  await page.getByLabel('Nome do acompanhante').fill(companionName)
  await expect(page.getByText('Ninguém com esse nome na sua lista.')).toBeVisible({
    timeout: 10_000,
  })

  // O nome digitado na busca vai para o campo — não se redigita.
  await page.getByRole('button', { name: /^Incluir/ }).click()
  await expect(page.getByLabel('Nome completo').last()).toHaveValue(companionName)
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()

  // A fila do núcleo mostra as DUAS pessoas — o convidado deste cadastro
  // incluído, porque o núcleo é simétrico e a ordem dele é escolha, não
  // consequência de qual cadastro foi aberto.
  //
  // Por linha, e não por `getByText(nome)`: o nome de cada pessoa aparece
  // também nos rótulos acessíveis das ações da linha ("Editar X", "Subir X na
  // ordem"), então buscar o texto solto casa com cinco elementos.
  const filaDoNucleo = page.getByRole('listitem')
  await expect(filaDoNucleo.filter({ hasText: companionName })).toHaveCount(1)
  await expect(filaDoNucleo.filter({ hasText: primaryName })).toHaveCount(1)
  await expect(page.locator('p', { hasText: 'Na lista, aparece como' })).toBeVisible()

  // O convite é uma AÇÃO pedida, não uma caixa já marcada: a linha explica o
  // que falta (sem convite não há RSVP) e o botão registra o pedido. Nome e
  // observações do convite não moram mais aqui — são da tela de Convites.
  const linhaDoConvite = page.getByRole('dialog').locator('section', { hasText: 'Convite' }).last()
  await expect(linhaDoConvite).toContainText('não conseguem responder ao RSVP')
  await linhaDoConvite.getByRole('button', { name: 'Criar convite' }).click()
  // Diz o nome derivado antes de salvar, para não haver surpresa.
  await expect(linhaDoConvite).toContainText('Será criado ao salvar')
  await expect(linhaDoConvite).toContainText(`Família ${primaryName.split(' ')[0]}`)

  // O cadastro no estado mais cheio que ele alcança: acompanhante incluído, a
  // fila do núcleo montada e a linha do convite já resolvida.
  await expectNoAccessibilityViolations(page, { rotulo: 'Convidados — cadastro com acompanhante' })

  await page.getByRole('button', { name: 'Cadastrar convidado' }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/${adminSlug}/convidados$`), { timeout: 10_000 })

  // --- reabrir o cadastro mostra o vínculo, que antes era invisível ---
  //
  // `GET /api/guests/:id` sempre devolveu `invite: { id, nome }`, e o formulário
  // usava isso apenas para ESCONDER o bloco: o cadastro sabia do convite e não
  // dizia nem o nome nem como chegar lá.
  // Filtrar antes de clicar: a Visão Geral é paginada pelo servidor, e um
  // convidado recém-criado não está necessariamente na primeira página. E a
  // espera pela URL é obrigatória — o campo é debounced, e clicar dentro da
  // janela do debounce faz a gravação atrasada apagar o `?editar=<id>` que o
  // clique acabou de pôr (dívida registrada em ROADMAP.md).
  await expect(async () => {
    await page.getByPlaceholder('Digite um nome...').fill(primaryName)
    await expect(page).toHaveURL(/[?&]nome=/, { timeout: 3_000 })
  }).toPass({ timeout: 20_000 })

  await expect(async () => {
    await page
      .getByRole('button', { name: primaryName, exact: true })
      .filter({ visible: true })
      .first()
      .click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  const conviteVinculado = page
    .getByRole('dialog')
    .locator('section', { hasText: 'Convite' })
    .last()
  await expect(conviteVinculado).toContainText(`Família ${primaryName.split(' ')[0]}`)
  await expect(conviteVinculado.getByRole('link', { name: 'Abrir em Convites' })).toHaveAttribute(
    'href',
    /\/convites\?editar=/,
  )
  await page.getByRole('button', { name: 'Cancelar' }).click()

  // --- convite criado automaticamente, com responsável destacado ---
  // O detalhe do convite é um modal sobre a listagem: o nome na tabela é um
  // botão que o abre (a rota /convites/{id} só redireciona para cá).
  await page.goto(`/admin/${adminSlug}/convites`)
  // `toPass` porque a página admin ainda é renderizada no servidor: o `fill`
  // que chega antes da hidratação é descartado pelo Vue ao assumir o input, e
  // o filtro nunca sai do lugar.
  //
  // E a espera pela URL é obrigatória antes de clicar na linha: o campo é
  // debounced e grava o recorte na query (`useDebouncedText` ->
  // `filters.setText`). Clicando dentro da janela do debounce, a gravação
  // atrasada reescreve a query a partir de um retrato anterior e apaga o
  // `?editar=<id>` que o clique tinha acabado de pôr — o modal nunca abre.
  await expect(async () => {
    await page.getByPlaceholder('Filtrar por nome...').fill(`Família ${primaryName.split(' ')[0]}`)
    await expect(page).toHaveURL(/[?&]nome=/, { timeout: 3_000 })
  }).toPass({ timeout: 20_000 })
  // `exact`, não regex: desde o redesign do painel cada linha tem também os
  // botões de ação "Abrir convite <nome>"/"Excluir convite <nome>", e um nome
  // parcial passa a casar com três elementos.
  const inviteButton = page.getByRole('button', {
    name: `Família ${primaryName.split(' ')[0]}`,
    exact: true,
  })
  await expect(inviteButton).toBeVisible({ timeout: 10_000 })
  await inviteButton.click()

  const inviteDialog = page.getByRole('dialog')
  await expect(inviteDialog).toBeVisible({ timeout: 10_000 })
  // `exact`, senão o nome casa também com os rótulos de leitor de tela das
  // ações da pessoa dentro do modal ("Editar <nome>", "Remover <nome> do
  // convite"), que o redesign do painel acrescentou.
  await expect(inviteDialog.getByText(primaryName, { exact: true })).toBeVisible({
    timeout: 10_000,
  })
  await expect(inviteDialog.getByText('(Responsável)')).toBeVisible()

  // O modal do convite, com as duas pessoas e as ações por linha.
  await expectNoAccessibilityViolations(page, { rotulo: 'Convites — detalhe do convite' })

  // --- gera link de acesso e extrai o código (bloco do próprio modal) ---
  await inviteDialog.getByRole('button', { name: 'Gerar link' }).click()
  const linkInput = page.locator('input[disabled]')
  await expect(linkInput).toBeVisible({ timeout: 10_000 })
  const link = await linkInput.inputValue()
  const linkPath = new URL(link).pathname
  const [, slug, , code] = linkPath.split('/')
  expect(slug).toBeTruthy()
  expect(code).toBeTruthy()

  // --- RSVP público via atalho de link direto ---
  await page.goto(linkPath)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(primaryName)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(companionName)).toBeVisible()

  // Os dois botões de cada pessoa são encontrados pelo NOME dela, não pela
  // posição de um cartão. Aqui havia `div.rounded-lg.border` e índice — e o
  // teste quebrou quando a tela passou a agrupar o núcleo de Acompanhantes num
  // cartão só (as duas pessoas deste convite formam um), porque os dois "Estarei
  // lá" passaram a viver dentro do mesmo `div`.
  //
  // A quebra apontou um defeito de acessibilidade que já existia antes do
  // agrupamento: com um cartão por pessoa, quem enxerga se orientava pelo nome
  // logo acima, mas quem navega botão a botão ouvia "Estarei lá" repetido, sem
  // dono. Os botões ganharam `aria-label` com o nome, e este teste passou a usar
  // exatamente o mesmo caminho que um leitor de tela usa.
  // O RSVP do convidado é a única tela que uma pessoa de fora percorre inteira,
  // muitas vezes no celular e sem ajuda de ninguém — e é a que menos aparece em
  // teste manual, porque o casal nunca a vê.
  await expectNoAccessibilityViolations(page, { rotulo: 'RSVP — convite por link direto' })

  await page.getByRole('button', { name: `Estarei lá — ${primaryName}` }).click()
  await page.getByRole('button', { name: `Não poderei ir — ${companionName}` }).click()

  await page.getByRole('button', { name: 'Revisar e enviar' }).click()
  await page.getByRole('button', { name: 'Confirmar presença' }).click()
  await expect(page.getByText('Presença confirmada!')).toBeVisible({ timeout: 10_000 })

  // --- busca pública por nome também encontra o mesmo convidado ---
  await page.goto(`/${slug}/rsvp`)
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder('Seu nome completo').fill(primaryName)
  await expect(page.getByRole('button', { name: primaryName })).toBeVisible({ timeout: 10_000 })

  // A busca por nome com resultado na tela — o outro caminho de entrada do
  // convidado, e o único sem token nenhum.
  await expectNoAccessibilityViolations(page, { rotulo: 'RSVP — busca pública por nome' })
})
