import { expect, test } from '@playwright/test'

// O Financeiro contra o Supabase de desenvolvimento real, no desenho de
// 2026-09-11: três telas para três momentos — planejar (Orçamento), contratar
// (Fornecedores) e pagar (Pagamentos).
//
// O que estes testes protegem é justamente a separação: gasto só planejado não
// pode aparecer em Pagamentos, e valor fechado precisa atravessar as três telas
// sem alguém redigitar nada.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.skip(!email || !password, 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD não configurados')

async function entrar(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(password!)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/[^/]+$/, { timeout: 15_000 })

  const slug = new URL(page.url()).pathname.split('/')[2]
  if (!slug) throw new Error('Slug do casamento ativo não encontrado na URL pós-login.')
  return slug
}

test('o Orçamento mostra a viagem do dinheiro, do orçado ao pago', async ({ page }) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Orçamento' })).toBeVisible({
    timeout: 20_000,
  })

  for (const parada of ['Estimado', 'Contratado', 'Pago']) {
    await expect(page.getByText(parada, { exact: true }).first()).toBeVisible({ timeout: 20_000 })
  }

  await expect(page.getByText('Orçamento do casamento')).toBeVisible()
})

test('gasto sem valor fechado fica "a contratar" e não aparece em Pagamentos', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Orçamento' })).toBeVisible({
    timeout: 20_000,
  })

  // Abre a árvore inteira para alcançar as linhas de gasto.
  const fechados = page.getByRole('button', { expanded: false })
  for (let passo = 0; passo < 30; passo += 1) {
    if ((await fechados.count()) === 0) break
    await fechados.first().click()
    await page.waitForTimeout(120)
  }

  // O convite para fechar o valor é a porta da contratação, dentro da linha.
  const aContratar = page.getByRole('button', { name: 'registrar valor fechado' })
  await expect(aContratar.first()).toBeVisible({ timeout: 20_000 })

  // O gasto planejado precisa ter um nome visível no Orçamento...
  const nomeDoGastoPlanejado = 'Flores da cerimônia'
  await expect(page.getByText(nomeDoGastoPlanejado).first()).toBeVisible()

  // ...e NÃO pode existir em Pagamentos, onde só entra o que foi contratado.
  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText(nomeDoGastoPlanejado)).toHaveCount(0)
})

test('Pagamentos separa pago, a vencer e vencido, e a baixa acontece na linha', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })

  for (const indicador of ['Pago', 'A pagar', 'Vencidos', 'Próximos 30 dias']) {
    await expect(page.getByText(indicador, { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    })
  }

  // O filtro entra na URL — é o que permite a Visão do Orçamento apontar para
  // um recorte específico.
  // `toPass` porque a página admin renderiza no servidor: clique que chega
  // antes da hidratação é descartado em silêncio.
  await expect(async () => {
    await page.getByRole('button', { name: 'Vencidos' }).click({ timeout: 3_000 })
    await expect(page).toHaveURL(/filtro=vencidos/, { timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  await page.getByRole('button', { name: 'Todos' }).click()
  await expect(page).not.toHaveURL(/filtro=/)

  // Esperar a lista completa voltar antes de contar: logo depois de trocar o
  // filtro, a tabela ainda é a do recorte anterior, e contar aí faria o teste
  // se declarar "sem parcelas em aberto" sem ter olhado a lista certa.
  const marcarPago = page.getByRole('button', { name: 'Marcar pago' })
  await expect(marcarPago.first()).toBeVisible({ timeout: 20_000 })

  await marcarPago.first().click()
  await expect(page.getByRole('heading', { name: 'Registrar pagamento' })).toBeVisible({
    timeout: 10_000,
  })
  await page.getByRole('button', { name: 'Confirmar' }).click()

  // A ação volta como "Desfazer" na mesma linha: o estado é a data gravada,
  // não um destaque local.
  const desfazer = page.getByRole('button', { name: 'Desfazer' })
  await expect(desfazer.first()).toBeVisible({ timeout: 20_000 })

  // Desfaz para não deixar resíduo no casamento de desenvolvimento.
  await desfazer.first().click()
  await expect(page.getByRole('button', { name: 'Marcar pago' }).first()).toBeVisible({
    timeout: 20_000,
  })
})

test('contratar um fornecedor preenche o gasto planejado e cria o pagamento', async ({ page }) => {
  test.setTimeout(150_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/fornecedores`)
  await expect(page.getByRole('heading', { level: 1, name: 'Fornecedores' })).toBeVisible({
    timeout: 20_000,
  })

  // "Estúdio Luz" está em negociação para Fotografia, que tem um gasto
  // planejado sem valor fechado — exatamente o caso que a contratação resolve.
  const linha = page.locator('li').filter({ hasText: 'Estúdio Luz' }).last()
  await expect(linha).toBeVisible({ timeout: 20_000 })

  await expect(async () => {
    await linha.getByRole('button', { name: 'Registrar contratação' }).click()
    await expect(page.getByRole('heading', { name: /Contratar/ })).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  // O gasto é escolhido entre os planejados; a cotação já vem como sugestão.
  await page.getByRole('combobox', { name: 'Qual gasto?' }).click()
  await page.getByRole('option', { name: /Fotografia e making of/ }).click()

  await page.getByRole('button', { name: 'Confirmar contratação' }).click()

  // De volta ao Orçamento, o gasto deixou de ser "a contratar".
  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Orçamento' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('Fotografia e vídeo').first()).toBeVisible({ timeout: 20_000 })
})
