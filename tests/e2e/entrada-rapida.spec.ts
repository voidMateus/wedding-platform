import { expect, test } from '@playwright/test'

// Os dois caminhos de entrada em massa do Modo Lista, contra o Supabase de
// desenvolvimento real. Mesma condição de login.spec.ts.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.skip(!email || !password, 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD não configurados')

async function abrirModoLista(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(password!)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/[^/]+$/, { timeout: 15_000 })

  const slug = new URL(page.url()).pathname.split('/')[2]
  if (!slug) throw new Error('Slug do casamento ativo não encontrado na URL pós-login.')

  await page.goto(`/admin/${slug}/convidados/lista`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { level: 1, name: 'Lista de convidados' })).toBeVisible({
    timeout: 20_000,
  })
  return slug
}

test('entrada rápida cadastra pelo rodapé do bloco, sem abrir o cadastro', async ({ page }) => {
  test.setTimeout(90_000)
  const sufixo = Date.now().toString().slice(-8)
  await abrirModoLista(page)

  // `toPass` porque a página admin ainda renderiza no servidor: clique que
  // chega antes da hidratação é descartado em silêncio.
  const abrir = page.getByRole('button', { name: /^Adicionar convidado em / }).first()
  await expect(async () => {
    await abrir.click()
    await expect(page.getByPlaceholder('Nome e Enter para adicionar').first()).toBeVisible({
      timeout: 2_000,
    })
  }).toPass({ timeout: 20_000 })

  const campo = page.getByPlaceholder('Nome e Enter para adicionar').first()
  await campo.fill(`Zrapida${sufixo} Um`)
  await campo.press('Enter')
  await expect(page.getByText(/1 adicionado —/)).toBeVisible({ timeout: 15_000 })

  // O MESMO campo recebe o próximo nome: é isso que faz a entrada ser rápida —
  // sem reabrir nada, sem modal entre uma pessoa e a seguinte.
  await campo.fill(`Zrapida${sufixo} Dois`)
  await campo.press('Enter')
  await expect(page.getByText(/2 adicionados —/)).toBeVisible({ timeout: 15_000 })

  // A tabela chega no fim da rajada (a recarga é adiada de propósito).
  await expect(page.getByText(`Zrapida${sufixo} Dois`).first()).toBeVisible({ timeout: 25_000 })
})

test('colar da planilha entra pelo mesmo de-para da importação por arquivo', async ({ page }) => {
  test.setTimeout(90_000)
  const sufixo = Date.now().toString().slice(-8)
  await abrirModoLista(page)

  await expect(async () => {
    await page.getByRole('button', { name: 'Colar do Excel' }).click()
    await expect(page.getByLabel('Cole aqui')).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  // Exatamente o que o Excel põe na área de transferência: TSV com títulos.
  // `parsearCsv` autodetecta o separador, então colar não tem parser próprio.
  await page
    .getByLabel('Cole aqui')
    .fill(
      [
        'Nome\tGrupo\tE-mail',
        `Zcolar${sufixo} Um\tAmigos do Trabalho\tum${sufixo}@teste.com`,
        `Zcolar${sufixo} Dois\tAmigos do Trabalho\t`,
      ].join('\n'),
    )
  await page.getByRole('button', { name: 'Reconhecer colunas' }).click()

  await page.getByRole('button', { name: 'Revisar' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByText('2 a cadastrar')).toBeVisible({ timeout: 15_000 })
  await expect(dialogo.getByText(`Zcolar${sufixo} Um`)).toBeVisible()

  await dialogo.getByRole('button', { name: /^Importar/ }).click()
  await expect(page.getByText(`Zcolar${sufixo} Dois`).first()).toBeVisible({ timeout: 30_000 })
})

test('uma linha só não avança — cabeçalho sem ninguém embaixo', async ({ page }) => {
  test.setTimeout(90_000)
  await abrirModoLista(page)

  await expect(async () => {
    await page.getByRole('button', { name: 'Colar do Excel' }).click()
    await expect(page.getByLabel('Cole aqui')).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  await page.getByLabel('Cole aqui').fill('Nome\tGrupo')
  await page.getByRole('button', { name: 'Reconhecer colunas' }).click()

  await expect(page.getByText(/ao menos uma linha de convidado/)).toBeVisible({ timeout: 10_000 })
  // Continua no passo 1: um de-para sobre zero convidados levaria a uma
  // revisão vazia, sem explicar por quê.
  await expect(page.getByLabel('Cole aqui')).toBeVisible()
})
