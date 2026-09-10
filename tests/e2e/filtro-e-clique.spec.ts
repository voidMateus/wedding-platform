import { expect, test } from '@playwright/test'

/**
 * Filtrar e clicar numa linha na mesma janela do debounce.
 *
 * O estado dos filtros mora na URL, e o campo de busca só escreve nela depois
 * que a digitação para (`useDebouncedText`, 300ms). O clique na linha escreve
 * na MESMA URL, com `?editar=<id>` — então as duas escritas competem, e a
 * pergunta é se alguma apaga a outra.
 *
 * Era uma dívida registrada como bug aberto: "a gravação atrasada reescreve a
 * query a partir de um retrato anterior e apaga o `?editar=<id>` — o modal não
 * abre". A medição de 2026-09-10 mostrou que **não acontece mais**:
 * `applyQuery` monta o destino a partir de `route.query` no momento do flush e
 * mexe só nas chaves do próprio patch, então as duas escritas convivem. O
 * defeito foi consertado sem que a dívida fosse fechada.
 *
 * Este teste existe para que ninguém o reintroduza em silêncio, e afirma as
 * três coisas que precisam valer ao mesmo tempo: o modal abre, o texto
 * digitado continua no campo, e no fim a URL carrega os DOIS recortes.
 *
 * Depende de um casamento com convidados já cadastrados (mesma condição de
 * login.spec.ts) porque o defeito só existe com linha para clicar.
 */
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.skip(!email || !password, 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD não configurados')

test('filtrar e clicar na linha no mesmo instante não apaga nem o modal nem o filtro', async ({
  page,
}) => {
  test.setTimeout(90_000)

  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('E-mail').fill(email!)
  await page.getByLabel('Senha').fill(password!)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/[^/]+$/, { timeout: 20_000 })
  const slug = new URL(page.url()).pathname.split('/')[2]

  await page.goto(`/admin/${slug}/convidados`)
  await expect(page.getByRole('heading', { level: 1, name: 'Lista de convidados' })).toBeVisible({
    timeout: 20_000,
  })

  // O nome da primeira linha, qualquer que seja a massa do ambiente.
  const nomeDaLinha = page.getByRole('row').nth(1).locator('button').first()
  await expect(nomeDaLinha).toBeVisible({ timeout: 20_000 })
  const nome = ((await nomeDaLinha.textContent()) ?? '').trim()
  test.skip(!nome, 'nenhum convidado cadastrado neste ambiente')

  const recorte = nome.slice(0, 4)
  const campoBusca = page.getByPlaceholder('Digite um nome...')

  // `toPass` em volta da digitação: a página é renderizada no servidor, e
  // tecla enviada antes de o Vue hidratar não acumula no campo — cada uma
  // substitui a anterior, porque o valor volta do `:value` a cada render. É a
  // mesma armadilha que os outros E2E deste repo contornam assim, e não tem
  // nada a ver com o defeito que este teste guarda.
  await expect(async () => {
    await campoBusca.fill('')
    await campoBusca.pressSequentially(recorte, { delay: 40 })
    await expect(campoBusca).toHaveValue(recorte, { timeout: 1_000 })
  }).toPass({ timeout: 20_000 })

  // Clique NO MEIO da janela do debounce: a distância mais curta possível
  // entre o último caractere e a navegação.
  await page.getByRole('button', { name: nome, exact: true }).first().click()

  // 1. O modal abre — era isto que o bug relatado impedia.
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 })

  // 2. O texto digitado não é descartado pela navegação.
  await expect(campoBusca).toHaveValue(recorte)

  // 3. E as duas escritas convivem na URL depois do flush do debounce.
  await expect(page).toHaveURL(/[?&]editar=/, { timeout: 15_000 })
  await expect(page).toHaveURL(new RegExp(`[?&]nome=${recorte}`), { timeout: 15_000 })
})
