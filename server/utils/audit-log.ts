import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serverSupabaseClient } from '#supabase/server'
import type { Database, Json } from '~/types/database.types'

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

/**
 * Registra uma ação que a PLATAFORMA tomou sozinha — `tipo_autor = 'sistema'`,
 * sem autor (CLAUDE.md, seção 11).
 *
 * Recebe o client `service_role` em vez do `H3Event` porque quem chama é o
 * cron: não há sessão, não há membro, e a RLS de `trilha_auditoria` (insert só
 * de membro do casamento) recusaria a linha.
 *
 * Além de auditoria, é o que impede o envio duplicado: "já mandei o aviso de
 * pagamento deste casamento hoje?" é respondido por esta trilha, não por uma
 * coluna `ultimo_lembrete_em` a manter sincronizada — mesma regra que fez
 * `enviado_em` virar derivado.
 */
export async function recordSystemAuditLog(
  admin: SupabaseClient<Database>,
  weddingId: string,
  input: AuditLogInput,
): Promise<void> {
  const { error } = await admin.from('trilha_auditoria').insert({
    casamento_id: weddingId,
    autor_id: null,
    tipo_autor: 'sistema',
    acao: input.action,
    tipo_entidade: input.entityType,
    entidade_id: input.entityId,
    metadados: (input.metadata ?? {}) as Json,
  })

  if (error) {
    console.error('[audit-log:sistema] falha ao registrar', input.action, error.message)
  }
}

/**
 * Registra uma ação da EQUIPE INTERNA tomada pelo /plataforma —
 * `tipo_autor = 'operador'`, com o operador identificado
 * (docs/fase5-multievento.md seção 7).
 *
 * Recebe o client `service_role` e o id do operador pelo mesmo motivo que o
 * cron recebe o dele: o caminho Plataforma é deliberadamente cross-tenant, e
 * nenhuma policy de RLS consegue expressar "qualquer tenant" (CLAUDE.md 4.2).
 *
 * `casamento_id` continua obrigatório e continua certo: a ação do operador
 * acontece sempre SOBRE um casamento. A trilha é do casamento, então o casal lê
 * no próprio painel o que a plataforma fez no evento dele — e isso é honesto,
 * não vazamento.
 *
 * A exclusão é a única ação de operador que NÃO passa por aqui: ela apaga a
 * trilha junto com o casamento (cascade), então o registro dela vive em
 * `exclusoes_de_casamento`.
 */
export async function recordPlatformAuditLog(
  admin: SupabaseClient<Database>,
  weddingId: string,
  operatorUserId: string,
  input: AuditLogInput,
): Promise<void> {
  const { error } = await admin.from('trilha_auditoria').insert({
    casamento_id: weddingId,
    autor_id: null,
    autor_operador_id: operatorUserId,
    tipo_autor: 'operador',
    acao: input.action,
    tipo_entidade: input.entityType,
    entidade_id: input.entityId,
    metadados: (input.metadata ?? {}) as Json,
  })

  if (error) {
    console.error('[audit-log:operador] falha ao registrar', input.action, error.message)
  }
}
