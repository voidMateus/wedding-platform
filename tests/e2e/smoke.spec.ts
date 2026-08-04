import { expect, test } from '@playwright/test'

test('home carrega e exibe o cabeçalho de verificação do scaffold', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'MeuSiteCasamento' })).toBeVisible()
})
