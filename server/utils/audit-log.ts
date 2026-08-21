import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

interface AuditLogInput {
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
}

/**
 * Registra uma ação administrativa sensível (CLAUDE.md, seções 19.3, 28).
 * Escreve com o client autenticado da própria requisição — a RLS de
 * trilha_auditoria (insert restrito a membros do casamento) garante que só
 * quem tem acesso ao casamento consegue inserir.
 *
 * Falha ao auditar nunca derruba a operação principal — só é logada.
 */
export async function recordAuditLog(
  event: H3Event,
  weddingId: string,
  memberId: string,
  input: AuditLogInput,
): Promise<void> {
  const client = await serverSupabaseClient(event)

  const { error } = await client.from('trilha_auditoria').insert({
    casamento_id: weddingId,
    autor_id: memberId,
    tipo_autor: 'membro',
    acao: input.action,
    tipo_entidade: input.entityType,
    entidade_id: input.entityId,
    metadados: input.metadata ?? {},
  })

  if (error) {
    console.error('[audit-log] falha ao registrar', input.action, error.message)
  }
}
