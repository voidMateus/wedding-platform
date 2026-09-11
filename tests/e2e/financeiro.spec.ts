import { expect, test } from '@playwright/test'

// O Financeiro contra o Supabase de desenvolvimento real: três telas para três
// momentos — planejar (Orçamento), cotar e contratar (Fornecedores) e pagar
// (Pagamentos).
//
// O que estes testes protegem é a CONEXÃO entre elas: um gasto planejado
// aparece para cotação, as propostas do mesmo gasto ficam lado a lado, e o que
// é contratado chega a Pagamentos — inclusive sem parcela definida, que era o
// furo mais fácil de virar conta esquecida.
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

test('o Orçamento mostra os quatro números, com "a pagar" entre eles', async ({ page }) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Orçamento' })).toBeVisible({
    timeout: 20_000,
  })

  // "A pagar" é cartão próprio, não nota de rodapé do Pago: é uma das
  // perguntas que o casal mais repete.
  for (const parada of ['Estimado', 'Contratado', 'Pago', 'A pagar']) {
    await expect(page.getByText(parada, { exact: true }).first()).toBeVisible({ timeout: 20_000 })
  }

  await expect(page.getByText('Orçamento do casamento')).toBeVisible()
})

test('gasto planejado fica "a contratar" e não aparece em Pagamentos', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Orçamento' })).toBeVisible({
    timeout: 20_000,
  })

  const planejado = 'Flores da cerimônia'
  await expect(page.getByRole('row').filter({ hasText: planejado }).first()).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('button', { name: 'Registrar valor' }).first()).toBeVisible()

  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('row').filter({ hasText: planejado })).toHaveCount(0)
})

test('contratado sem parcela aparece em Pagamentos como "Sem data"', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })

  // "Celebrante" foi contratado e ninguém definiu como pagar — ele PRECISA
  // estar aqui, senão vira uma conta que só reaparece quando alguém lembra.
  const linha = page.getByRole('row').filter({ hasText: 'Celebrante' }).first()
  await expect(linha).toBeVisible({ timeout: 20_000 })
  // "Sem data" aparece duas vezes na linha de propósito: na coluna de
  // vencimento (é o que falta) e no selo de estado.
  await expect(linha.getByText('Sem data', { exact: true }).first()).toBeVisible()
  await expect(linha.getByText('contratado, falta definir')).toBeVisible()
  await expect(linha.getByRole('button', { name: 'Agendar' })).toBeVisible()
})

test('Pagamentos registra a baixa na própria linha', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })

  const marcarPago = page.getByRole('button', { name: 'Marcar pago' })
  await expect(marcarPago.first()).toBeVisible({ timeout: 20_000 })

  // `toPass` porque a página admin renderiza no servidor: clique que chega
  // antes da hidratação é descartado em silêncio.
  await expect(async () => {
    await marcarPago.first().click({ timeout: 3_000 })
    await expect(page.getByRole('heading', { name: 'Registrar pagamento' })).toBeVisible({
      timeout: 3_000,
    })
  }).toPass({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Confirmar' }).click()

  const desfazer = page.getByRole('button', { name: 'Desfazer' })
  await expect(desfazer.first()).toBeVisible({ timeout: 20_000 })

  // Desfaz para não deixar resíduo no casamento de desenvolvimento.
  await desfazer.first().click()
  await expect(page.getByRole('button', { name: 'Marcar pago' }).first()).toBeVisible({
    timeout: 20_000,
  })
})

test('as cotações do mesmo gasto ficam juntas, com a menor destacada', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/fornecedores`)
  await expect(page.getByRole('heading', { level: 1, name: 'Fornecedores' })).toBeVisible({
    timeout: 20_000,
  })

  // Três propostas de refrigerante, agrupadas sob o gasto que elas disputam —
  // é isso que torna a comparação possível.
  await expect(page.getByText('Refrigerantes').first()).toBeVisible({ timeout: 20_000 })
  for (const cotacao of ['Distribuidora Sul', 'Bebidas Express', 'Atacado do Zé']) {
    await expect(page.getByRole('row').filter({ hasText: cotacao }).first()).toBeVisible({
      timeout: 20_000,
    })
  }

  const maisBarato = page.getByRole('row').filter({ hasText: 'Atacado do Zé' }).first()
  await expect(maisBarato.getByText('menor preço')).toBeVisible()

  // E elas chegam em ordem de preço, sem ninguém pedir: comparar propostas com
  // a mais cara no topo é olhar a lista errada.
  const nomes = await page.getByRole('row').locator('td:first-child').allInnerTexts()
  const refrigerantes = nomes
    .map((texto) => texto.trim())
    .filter((texto) =>
      ['Atacado do Zé', 'Distribuidora Sul', 'Bebidas Express'].some((nome) =>
        texto.startsWith(nome),
      ),
    )
  expect(refrigerantes[0]).toContain('Atacado do Zé')
  expect(refrigerantes[2]).toContain('Bebidas Express')
})

test('a ordenação da coluna ordena de verdade', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  // O menu de ordenação existia em três telas e não mexia uma linha de lugar:
  // as páginas filtravam à mão e nunca ordenavam. Filtro que não filtra é pior
  // que filtro ausente, porque quem usa confia nele.
  await page.goto(`/admin/${slug}/financeiro/pagamentos?ordenar=valor&direcao=desc`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })

  const valorDaLinha = async (indice: number) => {
    const texto = await page.getByRole('row').nth(indice).locator('td').nth(2).innerText()
    return Number(texto.replace(/[^\d]/g, ''))
  }

  // nth(0) é o cabeçalho; as duas primeiras linhas de dados vêm depois.
  await expect(async () => {
    const primeiro = await valorDaLinha(1)
    const segundo = await valorDaLinha(2)
    expect(primeiro).toBeGreaterThanOrEqual(segundo)
    expect(primeiro).toBeGreaterThan(0)
  }).toPass({ timeout: 20_000 })

  await page.goto(`/admin/${slug}/financeiro/pagamentos?ordenar=valor&direcao=asc`)
  await expect(async () => {
    const primeiro = await valorDaLinha(1)
    const segundo = await valorDaLinha(2)
    expect(primeiro).toBeLessThanOrEqual(segundo)
  }).toPass({ timeout: 20_000 })
})

test('fornecedor arquivado tem caminho de volta', async ({ page }) => {
  test.setTimeout(150_000)
  const nome = `ZForn ${Date.now().toString().slice(-8)}`
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/fornecedores`)
  await expect(page.getByRole('heading', { level: 1, name: 'Fornecedores' })).toBeVisible({
    timeout: 20_000,
  })

  await expect(async () => {
    await page.getByRole('button', { name: 'Adicionar cotação' }).first().click()
    await expect(page.getByLabel('Nome', { exact: true })).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  await page.getByLabel('Nome', { exact: true }).fill(nome)
  // Dentro do modal: "Adicionar cotação" também é o CTA do cabeçalho e o
  // rodapé de cada bloco.
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar cotação' }).click()

  const linha = page.getByRole('row').filter({ hasText: nome }).first()
  await expect(linha).toBeVisible({ timeout: 20_000 })

  await linha.getByRole('button', { name: 'Arquivar' }).click()
  await page.getByRole('button', { name: 'Arquivar', exact: true }).last().click()
  await expect(page.getByRole('row').filter({ hasText: nome })).toHaveCount(0, {
    timeout: 20_000,
  })

  // O caminho de volta: a seção de arquivados, com Restaurar.
  const arquivados = page.getByRole('button', { name: /cotaç(ão|ões) arquivadas?$/ })
  await expect(arquivados).toBeVisible({ timeout: 20_000 })
  await arquivados.click()

  const linhaArquivada = page.locator('li').filter({ hasText: nome }).last()
  await expect(linhaArquivada).toBeVisible({ timeout: 10_000 })
  await linhaArquivada.getByRole('button', { name: 'Restaurar' }).click()

  await expect(page.getByRole('row').filter({ hasText: nome }).first()).toBeVisible({
    timeout: 20_000,
  })

  // Limpeza.
  await page
    .getByRole('row')
    .filter({ hasText: nome })
    .first()
    .getByRole('button', { name: 'Arquivar' })
    .click()
  await page.getByRole('button', { name: 'Arquivar', exact: true }).last().click()
  await expect(page.getByRole('row').filter({ hasText: nome })).toHaveCount(0, {
    timeout: 20_000,
  })
})
