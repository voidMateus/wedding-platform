import { serverSupabaseUser } from '#supabase/server'

/**
 * Remove o acesso de alguém a um casamento, pela ficha do painel interno
 * (docs/fase5-multievento.md 6.6).
 *
 * Remove só o vínculo em `membros_casamento` — nunca a conta em `auth.users`:
 * a pessoa pode administrar outro casamento, ou simplesmente perder acesso a
 * este sem deixar de existir.
 *
 * **Nunca remove o último dono.** A escada de papéis não vale para o operador
 * (ele está fora dela), mas esta regra sim: um casamento sem dono é um tenant
 * que ninguém alcança, visível no painel interno e em lugar nenhum além dele —
 * exatamente o que a criação em transação existe para evitar. No caso de
 * suporte que motivou esta tela (e-mail errado no cadastro), a ordem é
 * vincular o dono certo primeiro e só então remover o errado.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)

  const weddingId = getRouterParam(event, 'id')
  const memberId = getRouterParam(event, 'memberId')
  if (!weddingId || !memberId) {
    throw badRequestError('id do casamento ou do membro não informado.')
  }

  const admin = supabaseAdmin(event)

  const { data: alvo, error: alvoError } = await admin
    .from('membros_casamento')
    .select('id, papel')
    .eq('id', memberId)
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (alvoError) throw badRequestError(alvoError.message)
  if (!alvo) throw notFoundError('Membro não encontrado neste casamento.')

  if (alvo.papel === 'dono') {
    const { count, error: countError } = await admin
      .from('membros_casamento')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', weddingId)
      .eq('papel', 'dono')
      // Acesso de suporte da plataforma NÃO conta como dono
      // (docs/fase5-multievento.md 6.7): ele é temporário, e um casamento cujo
      // único "dono" fosse a equipe interna estaria órfão do mesmo jeito.
      .is('acesso_suporte_expira_em', null)

    if (countError) throw badRequestError(countError.message)
    if ((count ?? 0) <= 1) {
      throw conflictError(
        'Não é possível remover o único dono. Vincule o dono novo antes de remover o atual.',
      )
    }
  }

  const { error } = await admin.from('membros_casamento').delete().eq('id', memberId)
  if (error) throw badRequestError(error.message)

  await recordPlatformAuditLog(admin, weddingId, operador!.sub, {
    action: 'wedding_member.remove',
    entityType: 'wedding_member',
    entityId: memberId,
    metadata: { papel: alvo.papel },
  })

  return { ok: true }
})
