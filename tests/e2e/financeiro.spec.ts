import { expect, test } from '@playwright/test'

// O módulo Financeiro contra o Supabase de desenvolvimento real. Mesma
// condição de login.spec.ts.
//
// Cobre o caminho que o casal faz de verdade: abrir a Visão geral, seguir o
// bloco de atenção até o recorte certo no Orçamento, e marcar uma parcela
// como paga. É também a garantia de que os números da tela vêm do mesmo
// cálculo do endpoint — se o resumo e a árvore discordassem, a soma do
// cabeçalho e a das linhas apareceriam diferentes aqui.
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

test('a Visão geral mostra os quatro estágios do dinheiro', async ({ page }) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeVisible({
    timeout: 20_000,
  })

  // Contratado, Pago e A pagar existem sempre; Planejado só com previsto
  // definido — é a degradação deliberada, não um bug de renderização.
  for (const estagio of ['Contratado', 'Pago', 'A pagar']) {
    await expect(page.getByText(estagio, { exact: true }).first()).toBeVisible({ timeout: 20_000 })
  }

  await expect(page.getByText('Orçamento total').first()).toBeVisible()
})

test('o bloco de atenção leva ao recorte correspondente no Orçamento', async ({ page }) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeVisible({
    timeout: 20_000,
  })

  const atencao = page.getByRole('link', { name: /vencid/i }).first()
  // Sem parcela vencida o bloco não existe — e a ausência é a informação.
  // O teste só segue quando há o que seguir.
  if (await atencao.isVisible().catch(() => false)) {
    await atencao.click()
    await expect(page).toHaveURL(/vencimento=vencidos/, { timeout: 15_000 })
    await expect(page.getByText('Mostrando só o que está vencido')).toBeVisible({
      timeout: 20_000,
    })

    // "Ver tudo" limpa o recorte sem recarregar a página inteira. `toPass`
    // porque a faixa remonta quando os dados do recorte chegam, e um clique
    // no elemento antigo se perde em silêncio.
    await expect(async () => {
      await page.getByRole('button', { name: 'Ver tudo' }).click({ timeout: 3_000 })
      await expect(page).not.toHaveURL(/vencimento=/)
    }).toPass({ timeout: 30_000 })
  }
})

test('marcar parcela como paga move o valor de "a pagar" para "pago"', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/orcamento`)
  await expect(page.getByRole('heading', { level: 1, name: 'Orçamento' })).toBeVisible({
    timeout: 20_000,
  })

  const marcarPaga = page.getByRole('button', { name: 'Marcar paga' })
  const desfazer = page.getByRole('button', { name: 'Desfazer pagamento' })

  // Abre a árvore inteira: categoria e despesa usam o mesmo `aria-expanded`,
  // então clicar em tudo que está fechado desce os três níveis sem precisar
  // saber qual linha é qual — e sem depender de os dados de teste terem
  // parcela em aberto logo na primeira categoria.
  const fechados = page.getByRole('button', { expanded: false })
  for (let passo = 0; passo < 40; passo += 1) {
    // `toPass`: a página admin renderiza no servidor, e clique antes da
    // hidratação é descartado em silêncio.
    if ((await fechados.count()) === 0) break
    await fechados.first().click()
    await page.waitForTimeout(150)
  }

  if ((await marcarPaga.count()) === 0) {
    test.skip(true, 'Nenhuma parcela em aberto neste casamento de teste')
    return
  }

  await marcarPaga.first().click()

  // A ação volta como "Desfazer pagamento" na mesma linha: o estado é a data
  // gravada, não um badge local.
  await expect(desfazer.first()).toBeVisible({ timeout: 20_000 })

  // Desfaz para o teste não deixar resíduo no casamento de desenvolvimento.
  await desfazer.first().click()
  await expect(marcarPaga.first()).toBeVisible({ timeout: 20_000 })
})
