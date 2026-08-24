/**
 * Porta fixa do servidor Nitro de build (`.output/server/index.mjs`) usado
 * pelas suítes de `tests/integration/api/` e `tests/integration/guest-path/`
 * — subido uma única vez por `global-setup.ts` (docs/ARCHITECTURE.md, seção
 * 9.6) e compartilhado entre todos os arquivos de teste HTTP, evitando pagar
 * o custo de build/boot por arquivo.
 */
export const TEST_SERVER_PORT = 4319
export const TEST_SERVER_BASE_URL = `http://127.0.0.1:${TEST_SERVER_PORT}`
