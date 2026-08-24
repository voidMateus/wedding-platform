import 'dotenv/config'
import { spawn, type ChildProcess } from 'node:child_process'
import { TEST_SERVER_BASE_URL, TEST_SERVER_PORT } from './helpers/test-server'

/**
 * Sobe o servidor Nitro já buildado (`.output/server/index.mjs`) uma única
 * vez para toda a rodada de `npm run test:integration` (docs/ARCHITECTURE.md,
 * seção 9.6) — as suítes de `api/` e `guest-path/` fazem requisições HTTP
 * reais contra ele, contra o Supabase real apontado por `SUPABASE_URL`
 * (local em CI via Docker, `dev` localmente via `.env` — nunca prod).
 *
 * Pré-requisito: `npm run build` já ter rodado (garantido pelo hook
 * `pretest:integration` em package.json).
 */
export default async function setup() {
  const server = spawn('node', ['.output/server/index.mjs'], {
    env: {
      ...process.env,
      PORT: String(TEST_SERVER_PORT),
      HOST: '127.0.0.1',
      NITRO_PORT: String(TEST_SERVER_PORT),
      NITRO_HOST: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let startupOutput = ''
  server.stdout?.on('data', (chunk) => (startupOutput += String(chunk)))
  server.stderr?.on('data', (chunk) => (startupOutput += String(chunk)))

  server.on('exit', (code) => {
    if (code !== null && code !== 0) {
      // eslint-disable-next-line no-console
      console.error('[tests/integration] servidor Nitro de teste encerrou inesperadamente:\n' + startupOutput)
    }
  })

  await waitForServer(server, startupOutput)

  return async () => {
    server.kill()
  }
}

async function waitForServer(server: ChildProcess, startupOutputRef: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (server.exitCode !== null) {
      throw new Error(`Servidor de teste encerrou antes de ficar pronto (código ${server.exitCode}):\n${startupOutputRef}`)
    }
    try {
      await fetch(TEST_SERVER_BASE_URL)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
  throw new Error(`Servidor de teste (${TEST_SERVER_BASE_URL}) não respondeu em ${timeoutMs}ms.`)
}
