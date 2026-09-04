import { readFileSync } from 'node:fs'

/** Porta do dev server quando nada define outra — o padrao historico do Nuxt. */
export const DEFAULT_DEV_PORT = 3000

/**
 * Resolve a porta do dev server: `NUXT_PORT` do ambiente, senao `NUXT_PORT`
 * do `.env`, senao 3000.
 *
 * O passo do `.env` existe porque o Nuxt NAO expoe o `.env` na avaliacao do
 * `nuxt.config.ts` (verificado: `process.env.NUXT_PORT` fica `undefined` ali
 * mesmo com a variavel no arquivo), e o Playwright nao le `.env` de forma
 * alguma. Sem esta leitura explicita, so `NUXT_PORT=... npm run dev` na mao
 * funcionaria — e quem esquecesse cairia no 3000, que e justamente a porta
 * que se quer liberar.
 *
 * Para que serve: mais de uma arvore do mesmo repo rodando ao mesmo tempo
 * (git worktree), cada uma na sua porta, definida num arquivo local e
 * gitignored em vez de num arquivo versionado que valeria para todos.
 *
 * Ao trocar a porta, mover `NUXT_SITE_URL` no mesmo `.env` junto: e dele que
 * saem os links e QR de convite, e um apontando para a porta de outra arvore
 * levaria o convidado ao app errado.
 *
 * O caminho do `.env` sai de `import.meta.url`, nao do cwd: assim o valor e o
 * mesmo venha a chamada do `nuxt.config.ts` ou do `playwright.config.ts`.
 *
 * @returns {number}
 */
export function resolveDevPort() {
  const fromEnvironment = Number(process.env.NUXT_PORT)
  if (Number.isInteger(fromEnvironment) && fromEnvironment > 0) return fromEnvironment

  try {
    const dotenv = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    const fromFile = Number(/^NUXT_PORT\s*=\s*(\d+)/m.exec(dotenv)?.[1])
    if (Number.isInteger(fromFile) && fromFile > 0) return fromFile
  } catch {
    // Sem `.env` (CI, clone novo) o default abaixo ja e o certo.
  }

  return DEFAULT_DEV_PORT
}
