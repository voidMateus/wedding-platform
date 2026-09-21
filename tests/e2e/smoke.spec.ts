import { expect, test } from '@playwright/test'

/**
 * A raiz do domínio atende os dois que chegam nela.
 *
 * Era uma página neutra que só explicava ao convidado perdido por que não
 * havia nada ali — e o casal que digitava o domínio, em vez de usar o link do
 * e-mail, lia a mesma frase e não tinha caminho nenhum para entrar (rodada de
 * usabilidade de 20/09/2026, ponto 6). O teste cobre os dois porque a correção
 * podia facilmente ter trocado um pelo outro.
 */
test('a raiz oferece a entrada e continua orientando o convidado', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)

  const entrar = page.getByRole('link', { name: 'Entrar' })
  await expect(entrar).toBeVisible()
  await expect(page.getByText('Você é convidado?')).toBeVisible()

  await entrar.click()
  await expect(page).toHaveURL(/\/login$/)
})
