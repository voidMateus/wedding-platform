import { serverSupabaseClient } from '#supabase/server'
import { inviteAddGuestsSchema } from '#shared/schemas/invites'

/**
 * Vincula convidado(s) já cadastrados a um convite existente — bloqueia
 * explicitamente quem já pertence a outro convite (CLAUDE.md, seção 12.1:
 * "um convidado só pode pertencer a um convite"). Usado pela tela de
 * detalhe do convite ao aceitar a sugestão automática de acompanhantes.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }
  const input = await validateBody(event, inviteAddGuestsSchema)

  const client = await serverSupabaseClient(event)

  const { data: invite, error: inviteError } = await client
    .from('invites')
    .select('id')
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (inviteError) throw badRequestError(inviteError.message)
  if (!invite) throw notFoundError('Convite não encontrado.')

  const { data: guests, error: guestsError } = await client
    .from('guests')
    .select('id, full_name, invite_id')
    .in('id', input.guestIds)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)

  if (guestsError) throw badRequestError(guestsError.message)

  const alreadyElsewhere = (guests ?? []).filter((g) => g.invite_id && g.invite_id !== id)
  if (alreadyElsewhere.length > 0) {
    throw conflictError(
      `${alreadyElsewhere.map((g) => g.full_name).join(', ')} já pertence a outro convite.`,
      { guestIds: alreadyElsewhere.map((g) => g.id) },
    )
  }

  const { error: updateError } = await client
    .from('guests')
    .update({ invite_id: id })
    .in('id', input.guestIds)
    .eq('wedding_id', weddingId)

  if (updateError) throw badRequestError(updateError.message)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.add_guests',
    entityType: 'invite',
    entityId: id,
    metadata: { guestIds: input.guestIds },
  })

  return { id, addedGuestIds: input.guestIds }
})
