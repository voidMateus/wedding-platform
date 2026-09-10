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
    await expect(page.getByPlaceholder(/^Nome e Enter/).first()).toBeVisible({
      timeout: 2_000,
    })
  }).toPass({ timeout: 20_000 })

  const campo = page.getByPlaceholder(/^Nome e Enter/).first()

  // RAJADA, sem esperar nada entre um nome e o outro: é a asserção que importa
  // aqui. A primeira versão dava `await` na criação e desabilitava o campo
  // durante a ida e volta, então o Enter seguinte era engolido e só chegariam
  // dois dos quatro nomes — "rápida como a rede, não como a digitação".
  const nomes = [1, 2, 3, 4].map((n) => `Zrapida${sufixo} ${n}`)
  for (const nomeCompleto of nomes) {
    await campo.fill(nomeCompleto)
    await campo.press('Enter')
    // O campo volta vazio no mesmo quadro, sem round-trip.
    await expect(campo).toHaveValue('')
  }

  await expect(page.getByText(/^4 adicionados/)).toBeVisible({ timeout: 20_000 })

  // A tabela chega no fim da rajada (a recarga é adiada de propósito).
  // `filter({ visible: true })`: cada convidado tem DOIS nós com o nome — a
  // linha de desktop e a do celular (`md:hidden`) —, e a do celular vem antes
  // no DOM, então `.first()` cairia na invisível.
  for (const nomeCompleto of nomes) {
    await expect(page.getByText(nomeCompleto).filter({ visible: true }).first()).toBeVisible({
      timeout: 25_000,
    })
  }
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
  await expect(
    page.getByText(`Zcolar${sufixo} Dois`).filter({ visible: true }).first(),
  ).toBeVisible({ timeout: 30_000 })
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

test('ações em massa: controles na barra no desktop, num modal no celular', async ({ page }) => {
  test.setTimeout(90_000)
  const slug = await abrirModoLista(page)

  const marcar = page.getByRole('checkbox', { name: /^Selecionar / }).first()
  await expect(async () => {
    await marcar.check()
    await expect(page.getByText(/1 selecionado/)).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  // Desktop: os quatro controles cabem na barra, então não há porta para abrir.
  await expect(page.getByLabel('Mover selecionados para grupo')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ações' })).toBeHidden()

  // Celular: uma linha só, e as ações atrás de "Ações". Em fileira, os quatro
  // controles embrulhavam um por linha e os seletores truncavam o rótulo.
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto(`/admin/${slug}/convidados/lista`)
  await page.waitForLoadState('networkidle')
  await expect(async () => {
    await page
      .getByRole('checkbox', { name: /^Selecionar / })
      .first()
      .check()
    await expect(page.getByRole('button', { name: 'Ações' })).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  await expect(page.getByLabel('Mover selecionados para grupo')).toBeHidden()

  // A barra não pode colar ATRÁS da barra de abas do celular (`fixed bottom-0`).
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 999999))
  const folga = await page.evaluate(() => {
    const abas = document.querySelector('nav.fixed')
    const barra = [...document.querySelectorAll('div')].find(
      (d) => d.className.includes('sticky') && d.textContent?.includes('selecionado'),
    )
    if (!abas || !barra) return null
    return Math.round(abas.getBoundingClientRect().top - barra.getBoundingClientRect().bottom)
  })
  expect(folga).not.toBeNull()
  expect(folga!).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Ações' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByLabel('Mover selecionados para grupo')).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Excluir' })).toBeVisible()
})
