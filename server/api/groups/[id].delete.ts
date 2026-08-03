import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete simples — diferente de invites, guests.group_id é
 * ON DELETE SET NULL (etiqueta organizacional, não unidade de RSVP), então
 * excluir um grupo não exige realocação prévia nem confirmação de cascata:
 * os convidados só perdem a etiqueta.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do grupo não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('groups')
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
    throw notFoundError('Grupo não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'group.delete',
    entityType: 'group',
    entityId: data.id,
    metadata: { name: data.name },
  })

  return { id: data.id }
})
