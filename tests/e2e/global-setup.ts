import { chromium } from '@playwright/test'
import { resolveDevPort } from '../../scripts/dev-port.mjs'

/**
 * Aquece o DEV SERVER antes da suíte — e só ele.
 *
 * Em CI não há o que aquecer: o `webServer` sobe o `.output` já compilado (ver
 * playwright.config.ts), que é a correção de verdade da corrida de cold start.
 * Aqui sobra o caso local, em que o valor do dev server é o HMR e a árvore pode
 * estar fria numa primeira rodada.
 *
 * O aquecimento precisa de um NAVEGADOR, não de um `fetch`: o que custa caro é
 * o bundle do cliente e a folha do Tailwind, e um `fetch` recebe o HTML do SSR
 * e para aí. Foi assim que a primeira versão deste arquivo resolveu metade do
 * problema — e a metade que faltou apareceu como uma violação de strict mode em
 * `getByRole('checkbox')`, que resolveu para DOIS elementos porque a linha de
 * desktop e a do celular só se excluem por CSS.
 *
 * O que este arquivo NÃO faz é entrar pela tela para alcançar as rotas atrás de
 * sessão. Tentou-se, e o login interativo sobre um Vite ainda compilando é
 * justamente onde o full reload derruba a navegação em voo: o aquecimento
 * passou a falhar sozinho, antes de qualquer teste. Rota autenticada fria custa
 * a compilação dela uma vez; login frio custa a rodada inteira.
 */
export default async function globalSetup() {
  if (process.env.CI) return

  const baseURL = `http://localhost:${resolveDevPort()}`
  const navegador = await chromium.launch()

  try {
    const page = await navegador.newPage({ baseURL })
    // Duas rotas, uma de cada renderização: `/` é o site público (SSR) e
    // `/login` entra no bundle do painel. Juntas pagam o CSS e quase todo o
    // grafo de módulos que as demais reaproveitam.
    for (const rota of ['/', '/login']) {
      try {
        await page.goto(rota, { waitUntil: 'networkidle', timeout: 120_000 })
      } catch {
        // Um aquecimento que falha não pode derrubar a suíte: o primeiro teste
        // dirá a verdade sobre o servidor melhor do que uma exceção de setup.
      }
    }
  } finally {
    await navegador.close()
  }
}
