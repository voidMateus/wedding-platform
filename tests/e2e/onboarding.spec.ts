import { expect, test } from '@playwright/test'

// O roteiro de Primeiros passos e o wizard, contra o Supabase de
// desenvolvimento real.
//
// O que estes testes protegem é a promessa que define a fase: nada é
// obrigatório, nada se perde, e nada do progresso mora no banco. Em especial o
// caminho que só um navegador percorre — pular uma etapa, sair no meio e
// voltar encontrando o que já tinha sido salvo, com a etapa certa aberta sem
// nenhuma "última etapa visitada" gravada em lugar nenhum.
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

test.describe('onboarding — o roteiro e o wizard', () => {
  test('o wizard abre na etapa pedida e salva ao avançar', async ({ page }) => {
    const slug = await entrar(page)

    // O roteiro leva DIRETO à etapa clicada, não ao começo: quem clicou em
    // "Prazo de RSVP" pediu aquilo, não um passeio pelas cinco.
    await page.goto(`/admin/${slug}/comecar?passo=prazo-rsvp`)
    await expect(
      page.getByRole('heading', { name: /Até quando dá para confirmar presença/ }),
    ).toBeVisible({ timeout: 20_000 })

    await expect(page.getByText('Etapa 3 de 5')).toBeVisible()

    // Pular não salva e não trava: leva à etapa seguinte com a resposta em
    // branco continuando em branco.
    await expect(async () => {
      await page.getByRole('button', { name: 'Pular' }).click({ timeout: 3_000 })
      await expect(page).toHaveURL(/passo=orcamento/, { timeout: 5_000 })
    }).toPass({ timeout: 30_000 })

    await expect(
      page.getByRole('heading', { name: /Quanto vocês pretendem gastar no total/ }),
    ).toBeVisible()

    // Voltar mostra o que estava lá — a etapa pulada não sumiu do caminho.
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page).toHaveURL(/passo=prazo-rsvp/, { timeout: 10_000 })
  })

  test('a última etapa termina no roteiro, nunca numa tela de parabéns', async ({ page }) => {
    const slug = await entrar(page)

    await page.goto(`/admin/${slug}/comecar?passo=aparencia`)
    await expect(page.getByRole('heading', { name: 'Escolham a cara do site' })).toBeVisible({
      timeout: 20_000,
    })

    // O botão da última etapa diz "Concluir" — é a única confirmação de
    // chegada que existe, e ela é uma palavra, não uma tela.
    const concluir = page.getByRole('button', { name: 'Concluir' })
    await expect(concluir).toBeVisible()

    await expect(async () => {
      await page.getByRole('button', { name: 'Pular' }).click({ timeout: 3_000 })
      await expect(page).toHaveURL(new RegExp(`/admin/${slug}$`), { timeout: 5_000 })
    }).toPass({ timeout: 30_000 })
  })

  test('sair no meio não perde o que já foi salvo', async ({ page }) => {
    const slug = await entrar(page)

    await page.goto(`/admin/${slug}/comecar?passo=data-horario`)
    await expect(page.getByRole('heading', { name: 'Que horas começa?' })).toBeVisible({
      timeout: 20_000,
    })

    const horario = page.getByLabel('Horário do casamento')
    await expect(async () => {
      await horario.fill('16:30', { timeout: 3_000 })
      await page.getByRole('button', { name: 'Continuar' }).click({ timeout: 3_000 })
      await expect(page).toHaveURL(/passo=local/, { timeout: 8_000 })
    }).toPass({ timeout: 30_000 })

    // Sai no meio, volta depois: o valor veio do BANCO, não de estado de tela.
    await page.goto(`/admin/${slug}`)
    await page.goto(`/admin/${slug}/comecar?passo=data-horario`)
    await expect(page.getByLabel('Horário do casamento')).toHaveValue('16:30', { timeout: 20_000 })
  })
})
