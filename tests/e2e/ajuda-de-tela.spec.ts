import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'

/**
 * A ajuda de tela: aparece uma vez, sai quando dispensada, e volta pelo "?".
 *
 * Quem abria Convidados, Mesas ou Presentes pela primeira vez recebia uma tela
 * pronta para quem já sabe o que ela faz (rodada de usabilidade de 20/09/2026,
 * ponto 8). O que este teste protege é o ciclo inteiro — um bloco que aparece
 * mas não some é pior que nenhum, e um que some e não volta esconde a
 * explicação de quem a quis depois.
 */
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

test('a explicação da tela aparece, se dispensa e volta pelo cabeçalho', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)

  // `entrarComo` marca a ajuda como vista, para os outros trinta testes não
  // conviverem com um banner de primeira visita. Aqui a primeira visita É o
  // cenário, então o cookie volta a zero.
  await page.context().clearCookies({ name: 'ajuda_vista' })

  await page.goto(`/admin/${slug}/mesas`)

  const ajuda = page.getByText('Onde cada pessoa vai sentar na festa.')
  await expect(ajuda).toBeVisible({ timeout: 20_000 })

  // --- dispensar tira da tela e NÃO volta numa visita nova ---
  await expect(async () => {
    await page.getByRole('button', { name: 'Dispensar esta explicação' }).click({ timeout: 3_000 })
    await expect(ajuda).toBeHidden({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  await page.reload()
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 20_000 })
  await expect(ajuda).toBeHidden()

  // --- e cada tela tem a sua: dispensar Mesas não dispensa Convidados ---
  await page.goto(`/admin/${slug}/convidados`)
  await expect(page.getByText('Quem vocês vão convidar, e quem já respondeu.')).toBeVisible({
    timeout: 20_000,
  })

  // --- o "?" do cabeçalho traz de volta a da tela atual ---
  await page.goto(`/admin/${slug}/mesas`)
  await expect(ajuda).toBeHidden({ timeout: 20_000 })

  await expect(async () => {
    await page.getByRole('button', { name: 'O que é esta tela?' }).click({ timeout: 3_000 })
    await expect(ajuda).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })
})
