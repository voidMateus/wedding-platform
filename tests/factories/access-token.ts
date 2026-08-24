import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>

/** Espelha server/utils/guest-access-token.ts#hashAccessCode — mesmo algoritmo, sem depender de auto-import do Nitro. */
function hashAccessCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/**
 * Cria uma credencial de acesso real (hash gravado, nunca o texto plano) e
 * devolve o código em texto plano para o teste usar no link/QR simulado.
 */
export async function createTestAccessToken(
  admin: AdminClient,
  casamentoId: string,
  conviteId: string,
): Promise<{ plainCode: string }> {
  const plainCode = randomBytes(18).toString('hex')
  const { error } = await admin.from('credenciais_acesso_convite').insert({
    casamento_id: casamentoId,
    convite_id: conviteId,
    codigo_hash: hashAccessCode(plainCode),
  })

  if (error) {
    throw new Error(`Falha ao criar credencial de teste: ${error.message}`)
  }
  return { plainCode }
}
