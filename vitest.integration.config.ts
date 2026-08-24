import { defineVitestConfig } from '@nuxt/test-utils/config'

/**
 * Config separada da de testes unitários (docs/ARCHITECTURE.md, seção 9.6)
 * — roda em Node puro (não happy-dom: clients Supabase reais, service_role
 * incluso, recusam a secret key ao detectar globais de browser), contra um
 * Supabase real (`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`
 * do ambiente — local via Docker em CI, `dev` via `.env` localmente) e um
 * servidor Nitro de build já pronto (`global-setup.ts`, subido uma única vez
 * pra toda a suíte de `api/`/`guest-path/`).
 */
export default defineVitestConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.{test,spec}.ts'],
    globalSetup: ['./tests/integration/global-setup.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    // Requisições HTTP reais contra um único servidor compartilhado — rodar
    // arquivos em paralelo é seguro (cada teste cria seu próprio casamento
    // isolado), mas manter sequencial evita saturar o rate limit real do
    // Upstash Redis usado pelos endpoints públicos.
    fileParallelism: false,
  },
})
