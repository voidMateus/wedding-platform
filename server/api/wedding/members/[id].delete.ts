/**
 * Remove um colaborador do casamento ativo (docs/PLANO-SAAS.md, Passo 3) —
 * só o dono pode remover, checado aqui em TypeScript (fecha o achado do
 * PRODUCT.md §7.3, mesmo racional de members/index.post.ts). Remove só o
 * vínculo em membros_casamento — nunca a conta em auth.users (a pessoa pode
 * administrar outro casamento, ou simplesmente perder acesso a este sem
 * deixar de existir como usuário).
 *
 * Nunca permite remover o último dono restante — deixaria o casamento sem
 * ninguém com permissão de gerenciar colaboradores ou excluir o evento.
 */
export default defineEventHandler(async (event) => {
  const context = await requireWeddingContext(event)
  if (context.role !== 'dono') {
    throw forbiddenError('Só o dono do casamento pode remover colaboradores.')
  }

  const memberId = getRouterParam(event, 'id')
  if (!memberId) {
    throw badRequestError('id do membro não informado.')
  }

  const admin = supabaseAdmin(event)

  const { data: target, error: targetError } = await admin
    .from('membros_casamento')
    .select('id, papel')
    .eq('id', memberId)
    .eq('casamento_id', context.weddingId)
    .maybeSingle()

  if (targetError) {
    throw badRequestError(targetError.message)
  }
  if (!target) {
    throw notFoundError('Membro não encontrado.')
  }

  if (target.papel === 'dono') {
    const { count, error: countError } = await admin
      .from('membros_casamento')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', context.weddingId)
      .eq('papel', 'dono')

    if (countError) {
      throw badRequestError(countError.message)
    }
    if ((count ?? 0) <= 1) {
      throw conflictError('Não é possível remover o único dono do casamento.')
    }
  }

  const { error: deleteError } = await admin.from('membros_casamento').delete().eq('id', memberId)
  if (deleteError) {
    throw badRequestError(deleteError.message)
  }

  await recordAuditLog(event, context.weddingId, context.memberId, {
    action: 'wedding_member.remove',
    entityType: 'wedding_member',
    entityId: memberId,
    metadata: { papel: target.papel },
  })

  return { ok: true }
})
