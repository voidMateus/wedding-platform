import { serverSupabaseUser } from '#supabase/server'

/**
 * Encerra o acesso de suporte deste operador a um casamento
 * (docs/fase5-multievento.md 6.7).
 *
 * A validade já garante que o acesso termina sozinho; este botão existe para
 * que ele termine **quando o atendimento termina**, e não quando o relógio
 * alcança. Uma coisa não substitui a outra: a validade cobre o esquecimento, o
 * botão cobre a intenção.
 *
 * Nunca remove vínculo de verdade: se o operador for membro real deste
 * casamento (dono do próprio evento, por exemplo), a linha dele não é de
 * suporte e fica onde está.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)

  const weddingId = getRouterParam(event, 'id')
  if (!weddingId) {
    throw badRequestError('id do casamento não informado.')
  }

  const admin = supabaseAdmin(event)

  const { error } = await admin
    .from('membros_casamento')
    .delete()
    .eq('casamento_id', weddingId)
    .eq('usuario_id', operador!.sub)
    .not('acesso_suporte_expira_em', 'is', null)

  if (error) throw badRequestError(error.message)

  await recordPlatformAuditLog(admin, weddingId, operador!.sub, {
    action: 'suporte.acesso_encerrado',
    entityType: 'casamento',
    entityId: weddingId,
    metadata: {},
  })

  return { ok: true }
})
