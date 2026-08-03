import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete do convite — os convidados nunca são excluídos junto, só
 * desvinculados (invite_id = null), voltando ao estado "sem convite" do
 * wizard (CLAUDE.md, seção 12.1). Diferente do antigo guest_groups, não há
 * necessidade de confirmação em cascata: guests.invite_id é nullable.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('invites')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .select('id, name')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Convite não encontrado.')
  }

  const { error: detachError } = await client
    .from('guests')
    .update({ invite_id: null })
    .eq('invite_id', id)

  if (detachError) {
    throw badRequestError(detachError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.delete',
    entityType: 'invite',
    entityId: id,
    metadata: { name: data.name },
  })

  return { id: data.id }
})
