import { serverSupabaseClient } from '#supabase/server'

/**
 * Excluir um grupo com convidados associados exige realocação prévia ou
 * confirmação explícita de cascata — nunca exclusão física silenciosa
 * (CLAUDE.md, seção 17.3). Cascata = soft delete dos convidados
 * (guests.deleted_at).
 *
 * O grupo em si também é soft-deleted, nunca excluído fisicamente:
 * guests.group_id é NOT NULL com ON DELETE RESTRICT, então um DELETE físico
 * na linha do grupo é rejeitado pelo Postgres enquanto qualquer convidado —
 * mesmo um já soft-deleted — ainda referenciar seu id. Excluir fisicamente
 * quebraria a referência histórica de "este convidado soft-deleted era do
 * grupo X" (ver migration 20260731090001).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do grupo não informado.')
  }
  const cascade = getQuery(event).cascade === 'true'

  const client = await serverSupabaseClient(event)

  const { data: group, error: groupError } = await client
    .from('guest_groups')
    .select('id, name')
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (groupError) {
    throw badRequestError(groupError.message)
  }
  if (!group) {
    throw notFoundError('Grupo não encontrado.')
  }

  const { count: activeGuestCount, error: countError } = await client
    .from('guests')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', id)
    .is('deleted_at', null)

  if (countError) {
    throw badRequestError(countError.message)
  }

  const guestsInGroup = activeGuestCount ?? 0

  if (guestsInGroup > 0 && !cascade) {
    throw conflictError(
      `Este grupo tem ${guestsInGroup} convidado(s). Realoque-os para outro grupo ou confirme a exclusão em cascata.`,
      { guestsInGroup },
    )
  }

  const now = new Date().toISOString()

  if (guestsInGroup > 0) {
    const { error: softDeleteError } = await client
      .from('guests')
      .update({ deleted_at: now })
      .eq('group_id', id)
      .is('deleted_at', null)

    if (softDeleteError) {
      throw badRequestError(softDeleteError.message)
    }
  }

  const { error: deleteError } = await client
    .from('guest_groups')
    .update({ deleted_at: now })
    .eq('id', id)
    .eq('wedding_id', weddingId)

  if (deleteError) {
    throw badRequestError(deleteError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_group.delete',
    entityType: 'guest_group',
    entityId: id,
    metadata: { name: group.name, guestsSoftDeleted: guestsInGroup },
  })

  return { id, guestsSoftDeleted: guestsInGroup }
})
