import { rsvpConfirmSchema } from '#shared/schemas/rsvp'

/**
 * Confirmação total (CLAUDE.md, seção 12.1) — só chamada depois de "Sim, sou
 * eu". Registra rsvp.first_access (se for o primeiro acesso) e retorna o
 * payload completo do convite, equivalente ao atalho por link direto
 * (/rsvp/[code]).
 */
export default defineEventHandler(async (event) => {
  const { guestId } = await validateBody(event, rsvpConfirmSchema)

  const client = supabaseAdmin(event)

  const { data: guest, error } = await client
    .from('guests')
    .select('id, wedding_id, invite_id')
    .eq('id', guestId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!guest || !guest.invite_id) {
    throw notFoundError('Convidado não encontrado.')
  }

  await recordFirstAccessIfNeeded(client, guest.wedding_id, guest.invite_id)
  issueRsvpSession(event, { weddingId: guest.wedding_id, inviteId: guest.invite_id })

  return buildRsvpInvitePayload(client, guest.wedding_id, guest.invite_id)
})
