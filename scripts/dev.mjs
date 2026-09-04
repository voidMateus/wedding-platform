import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolveDevPort } from './dev-port.mjs'

/**
 * Wrapper de `nuxt dev` que aplica a porta resolvida por dev-port.mjs.
 *
 * Existe porque a CLI do Nuxt resolve a porta ANTES de carregar o
 * `nuxt.config.ts` — verificado: com `devServer: { port: 3100 }` no config, o
 * `nuxt dev` ainda tentava 3000 e caia no 3003 por colisao. Nem
 * `devServer.port` nem `NUXT_PORT` dentro do `.env` sao respeitados; so
 * `--port` na linha de comando e a variavel ja presente no ambiente.
 *
 * Passar `--port` daqui e o que faz `npm run dev` simplesmente funcionar em
 * qualquer arvore do repo, sem a pessoa precisar lembrar de exportar nada. O
 * script e agnostico de porta: quem manda e o `.env` local (gitignored), e
 * sem `NUXT_PORT` o valor continua sendo 3000 — nada muda para o checkout
 * principal nem para o CI.
 *
 * Argumentos extras passam adiante, entao `npm run dev -- --host` segue
 * funcionando. Um `--port` explicito do usuario vence o do `.env`, porque
 * vem depois na linha de comando.
 */
const port = String(resolveDevPort())
const extraArgs = process.argv.slice(2)

// Sem `shell: true` e chamando o bin direto por `process.execPath`: cada
// camada extra (cmd.exe, npm) e um processo que sobrevive quando o pai e
// morto, deixando um `nuxt dev` orfao segurando a porta e o `.nuxt/nuxt.lock`
// -- o que ja rendeu uma dezena de servidores fantasma numa sessao. Assim a
// arvore e curta o suficiente para o kill do pai alcancar o filho.
const nuxtBin = fileURLToPath(new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url))

const child = spawn(process.execPath, [nuxtBin, 'dev', '--port', port, ...extraArgs], {
  stdio: 'inherit',
})

for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sinal, () => child.kill(sinal))
}

child.on('exit', (code, signal) => {
  // Repassa o desfecho real: sem isto, um dev server morto por sinal (ou por
  // OOM) sairia com 0 e passaria por encerramento limpo.
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
