import { serverSupabaseClient } from '#supabase/server'

/** Revoga um token de acesso sem gerar um novo (CLAUDE.md, seção 14.5). */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do token não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('credenciais_acesso_convite')
    .update({ revogado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('revogado_em', null)
    .select('id, convite_id')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Token de acesso não encontrado ou já revogado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_access_token.revoke',
    entityType: 'guest_access_token',
    entityId: id,
    metadata: { inviteId: data.convite_id },
  })

  return { id }
})
