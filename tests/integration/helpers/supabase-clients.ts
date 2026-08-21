import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * Clientes reais para testes de integração (docs/ARCHITECTURE.md, seção 9 —
 * nunca mockar o banco nessas suítes). Em CI apontam para o Supabase local
 * (Docker, `supabase start`, ver .github/workflows/ci.yml); localmente
 * apontam para o projeto `dev` via `.env` — nunca para `prod` (as
 * credenciais de prod não existem neste checkout).
 */

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} não definido — os testes de integração exigem um Supabase real ` +
        '(local via Docker em CI, ou o projeto dev via .env localmente).',
    )
  }
  return value
}

export function getServiceRoleClient() {
  return createClient<Database>(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function getAnonClient() {
  return createClient<Database>(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
