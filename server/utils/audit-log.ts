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
 * audit_logs (insert restrito a wedding members) garante que só quem tem
 * acesso ao wedding consegue inserir.
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

  const { error } = await client.from('audit_logs').insert({
    wedding_id: weddingId,
    actor_id: memberId,
    actor_type: 'member',
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.error('[audit-log] falha ao registrar', input.action, error.message)
  }
}
