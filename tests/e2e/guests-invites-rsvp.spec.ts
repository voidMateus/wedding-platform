import { expect, test } from '@playwright/test'

// Requer um usuário real já vinculado como wedding_member (mesma condição
// de login.spec.ts) — valida o fluxo ponta a ponta da reestruturação de
// Convidados/Acompanhantes/Convites/RSVP (CLAUDE.md, seção 12.1) contra o
// Supabase de desenvolvimento real.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.skip(!email || !password, 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD não configurados')

async function login(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(password!)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/[^/]+$/, { timeout: 10_000 })

  // Rotas admin carregam o casamento ativo na URL (/admin/{slug}/**,
  // docs/PLANO-SAAS.md Passo 3) — extrai o slug resolvido pelo middleware
  // pra montar as próximas navegações deste teste.
  const adminSlug = new URL(page.url()).pathname.split('/')[2]
  if (!adminSlug) throw new Error('Slug do casamento ativo não encontrado na URL pós-login.')
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
  await expect(page.getByText(companionName)).toBeVisible()

  // O convite aparece como linha marcável, já sugerida — sem passo próprio.
  await expect(page.getByLabel(/Criar um convite para estas 2 pessoas/)).toBeChecked()
  await page.getByRole('button', { name: 'Cadastrar convidado' }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/${adminSlug}/convidados$`), { timeout: 10_000 })

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

  const guestCards = page.locator('div.rounded-lg.border')
  await guestCards.nth(0).getByRole('button', { name: 'Estarei lá' }).click()
  await guestCards.nth(1).getByRole('button', { name: 'Não poderei ir' }).click()

  await page.getByRole('button', { name: 'Revisar e enviar' }).click()
  await page.getByRole('button', { name: 'Confirmar presença' }).click()
  await expect(page.getByText('Presença confirmada!')).toBeVisible({ timeout: 10_000 })

  // --- busca pública por nome também encontra o mesmo convidado ---
  await page.goto(`/${slug}/rsvp`)
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder('Seu nome completo').fill(primaryName)
  await expect(page.getByRole('button', { name: primaryName })).toBeVisible({ timeout: 10_000 })
})
