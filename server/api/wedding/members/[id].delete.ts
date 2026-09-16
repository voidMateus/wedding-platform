import { podeGerenciarPapel, rotuloDoPapel } from '#shared/papeis-de-membro'

/**
 * Remove um membro do casamento ativo (docs/PLANO-SAAS.md, Passo 3).
 *
 * Quem alcança quem é a escada (docs/fase5-multievento.md 4.2), checada
 * contra o papel do ALVO e em TypeScript (fecha o achado do PRODUCT.md §7.3,
 * mesmo racional de members/index.post.ts). Remove só o vínculo em
 * membros_casamento — nunca a conta em auth.users (a pessoa pode administrar
 * outro casamento, ou simplesmente perder acesso a este sem deixar de existir
 * como usuário).
 *
 * Nunca permite remover o último dono restante — deixaria o casamento sem
 * ninguém com permissão de gerenciar acessos ou excluir o evento. Esta regra
 * é separada da escada de propósito: a escada diz quem ALCANÇA quem, e o
 * último dono é sobre o casamento não ficar órfão.
 */
export default defineEventHandler(async (event) => {
  const context = await requireWeddingContext(event)

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

  const papelAlvo = target.papel as Parameters<typeof podeGerenciarPapel>[1]
  if (!podeGerenciarPapel(context.role, papelAlvo)) {
    throw forbiddenError(
      `Seu papel neste casamento não permite remover quem é ${rotuloDoPapel(papelAlvo)}.`,
    )
  }

  // Contagem de donos, não decisão de autorização: é a trava que impede o
  // casamento de ficar sem ninguém que gerencie acessos.
  if (target.papel === 'dono') {
    const { count, error: countError } = await admin
      .from('membros_casamento')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', context.weddingId)
      .eq('papel', 'dono')
      // Acesso de suporte da plataforma NÃO conta como dono
      // (docs/fase5-multievento.md 6.7): ele é temporário, e um casamento cujo
      // único "dono" fosse a equipe interna estaria órfão do mesmo jeito.
      .is('acesso_suporte_expira_em', null)

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
