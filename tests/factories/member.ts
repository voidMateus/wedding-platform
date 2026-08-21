import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { getAnonClient } from '../integration/helpers/supabase-clients'

type AdminClient = SupabaseClient<Database>

export const TEST_MEMBER_PASSWORD = 'teste-integracao-senha-fake-123!'

export interface TestMember {
  userId: string
  email: string
  /** Client já autenticado como este usuário — respeita RLS de verdade (nunca service_role). */
  client: SupabaseClient<Database>
}

/**
 * Cria um usuário real de `auth.users` + vínculo em `membros_casamento`, e
 * devolve um client autenticado como esse usuário. É o único jeito de
 * testar RLS de verdade — funções como `is_membro_casamento()` checam
 * `auth.uid()`, que só existe numa sessão real, não dá para simular com o
 * client `service_role` (que ignora RLS por completo).
 */
export async function createTestMember(
  admin: AdminClient,
  casamentoId: string,
  papel: 'dono' | 'colaborador' = 'dono',
): Promise<TestMember> {
  const email = `teste-integracao-${randomUUID()}@example.com`
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password: TEST_MEMBER_PASSWORD,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    throw new Error(`Falha ao criar usuário de teste: ${userError?.message}`)
  }

  // A partir daqui o usuário de auth já existe de verdade — qualquer falha
  // nas próximas etapas (rate limit do Supabase Auth incluso, observado sob
  // carga concorrente) precisa desfazer esse usuário antes de propagar o
  // erro, senão ele fica órfão pra sempre (nenhum casamento referencia
  // auth.users por cascata).
  try {
    const { error: memberError } = await admin.from('membros_casamento').insert({
      casamento_id: casamentoId,
      usuario_id: userData.user.id,
      papel,
    })
    if (memberError) {
      throw new Error(`Falha ao vincular membro de teste: ${memberError.message}`)
    }

    const client = getAnonClient()
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: TEST_MEMBER_PASSWORD })
    if (signInError) {
      throw new Error(`Falha ao autenticar usuário de teste: ${signInError.message}`)
    }

    return { userId: userData.user.id, email, client }
  } catch (err) {
    await admin.auth.admin.deleteUser(userData.user.id)
    throw err
  }
}

/**
 * `membros_casamento` já saiu por cascata da exclusão do casamento — só
 * falta o usuário de auth. A API de admin do Supabase Auth rate-limita sob
 * carga (achado real: rodar a suíte de integração inteira de uma vez, com
 * dezenas de create/deleteUser em sequência, dispara "Database error
 * deleting user" esporádico) — 3 tentativas com backoff curto absorve isso
 * sem mascarar uma falha genuinamente persistente.
 */
export async function deleteTestMember(admin: AdminClient, userId: string): Promise<void> {
  let lastError: string | undefined
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (!error) return
    lastError = error.message
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
  throw new Error(`Falha ao excluir usuário de teste ${userId} após 3 tentativas: ${lastError}`)
}
