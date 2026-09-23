// O servidor compilado herda o ambiente deste processo, e fora do CI as
// credenciais vivem no `.env` -- sem isto ele subiria sem Supabase. Em CI
// não existe `.env` e a chamada não faz nada: as variáveis vêm do job.
import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'
import { resolveDevPort } from './scripts/dev-port.mjs'

/**
 * Mesma porta que o `nuxt.config.ts` usa (ver scripts/dev-port.mjs). Um
 * `baseURL` fixo em 3000 era um risco real com `reuseExistingServer` ligado
 * fora do CI: a suite reaproveitaria o dev server de OUTRA arvore do repo,
 * testando o app errado e passando.
 */
const porta = resolveDevPort()
const baseURL = `http://localhost:${porta}`

export default defineConfig({
  testDir: './tests/e2e',
  // Só aquece o dev server local (ver tests/e2e/global-setup.ts); em CI não há
  // o que aquecer, porque o servidor já sobe compilado.
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    /**
     * A ajuda de tela já dispensada, para toda a suíte.
     *
     * O bloco de `shared/ajuda-de-tela.ts` aparece na primeira visita a cada
     * tela, e o texto dele usa o mesmo vocabulário da tela de propósito — foi
     * assim que um `getByText('Falta acomodar')` em Mesas passou a casar com
     * duas coisas. Deixar trinta specs dependendo de um banner de primeira
     * visita é tratar como cenário o que é acidente.
     *
     * Aqui, e não no helper de login: metade dos specs faz o próprio
     * `goto('/login')`, e um helper só alcançaria a outra metade. Quem exercita
     * a primeira visita é `ajuda-de-tela.spec.ts`, que limpa o cookie.
     */
    storageState: './tests/e2e/support/ajuda-vista.json',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /**
   * Em CI, o servidor JÁ COMPILADO -- nunca `npm run dev`.
   *
   * O dev server compila rota sob demanda e, enquanto faz isso, o Vite emite
   * full reload. Os dois viram corrida quando os testes rodam em paralelo, e
   * ela apareceu no CI com três máscaras diferentes: a URL parada em `/login`,
   * o `net::ERR_ABORTED` de uma navegação pedida sobre outra em voo, e uma
   * violação de strict mode em `getByRole('checkbox')` -- que resolveu para
   * dois elementos porque a linha de desktop e a do celular só se excluem por
   * CSS, e a folha ainda não tinha ficado pronta.
   *
   * Aquecer antes só mudava QUEM pagava a compilação. O `.output` não tem
   * nenhuma das duas coisas, e o pipeline já o constrói antes deste passo --
   * é o mesmo binário que os testes de integração usam desde sempre
   * (tests/integration/global-setup.ts).
   *
   * Fora do CI segue o dev server: aqui o valor é o HMR, e a árvore de quem
   * desenvolve quase nunca está fria.
   */
  webServer: {
    command: process.env.CI ? 'node .output/server/index.mjs' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(porta), NITRO_PORT: String(porta) },
  },
})
