import { serverSupabaseClient } from '#supabase/server'
import { inviteInputSchema } from '#shared/schemas/invites'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }
  const input = await validateBody(event, inviteInputSchema)

  const client = await serverSupabaseClient(event)

  // Convidado Responsável precisa ser um membro atual do próprio convite
  // (CLAUDE.md, seção 12.1).
  if (input.responsibleGuestId) {
    const { data: member, error: memberError } = await client
      .from('guests')
      .select('id')
      .eq('id', input.responsibleGuestId)
      .eq('invite_id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (memberError) throw badRequestError(memberError.message)
    if (!member) {
      throw badRequestError('O responsável precisa ser um convidado deste convite.')
    }
  }

  const { data, error } = await client
    .from('invites')
    .update({
      name: input.name,
      notes: input.notes || null,
      responsible_guest_id: input.responsibleGuestId || null,
      max_companions: input.maxCompanions ?? null,
    })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Convite não encontrado.')
  }

  if (input.tagIds) {
    const { error: deleteLinksError } = await client.from('invite_tag_links').delete().eq('invite_id', id)
    if (deleteLinksError) throw badRequestError(deleteLinksError.message)

    if (input.tagIds.length > 0) {
      const { error: insertLinksError } = await client
        .from('invite_tag_links')
        .insert(input.tagIds.map((tagId) => ({ invite_id: id, tag_id: tagId })))
      if (insertLinksError) throw badRequestError(insertLinksError.message)
    }
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.update',
    entityType: 'invite',
    entityId: data.id,
    metadata: { name: data.name },
  })

  return data
})
