import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete do convite — os convidados nunca são excluídos junto, só
 * desvinculados (convite_id = null), voltando ao estado "sem convite" do
 * wizard (CLAUDE.md, seção 12.1). Diferente do antigo guest_groups, não há
 * necessidade de confirmação em cascata: convidados.convite_id é nullable.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('convites')
    .update({ excluido_em: new Date().toISOString() })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select('id, nome')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Convite não encontrado.')
  }

  const { error: detachError } = await client
    .from('convidados')
    .update({ convite_id: null })
    .eq('convite_id', id)

  if (detachError) {
    throw badRequestError(detachError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.delete',
    entityType: 'invite',
    entityId: id,
    metadata: { name: data.nome },
  })

  return { id: data.id }
})
