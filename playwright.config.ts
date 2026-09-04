import { defineConfig, devices } from '@playwright/test'
import { resolveDevPort } from './scripts/dev-port.mjs'

/**
 * Mesma porta que o `nuxt.config.ts` usa (ver scripts/dev-port.mjs). Um
 * `baseURL` fixo em 3000 era um risco real com `reuseExistingServer` ligado
 * fora do CI: a suite reaproveitaria o dev server de OUTRA arvore do repo,
 * testando o app errado e passando.
 */
const baseURL = `http://localhost:${resolveDevPort()}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
