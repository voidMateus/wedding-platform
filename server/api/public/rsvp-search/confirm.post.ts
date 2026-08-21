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
    .from('convidados')
    .select('id, casamento_id, convite_id')
    .eq('id', guestId)
    .is('excluido_em', null)
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!guest || !guest.convite_id) {
    throw notFoundError('Convidado não encontrado.')
  }

  await recordFirstAccessIfNeeded(client, guest.casamento_id, guest.convite_id)
  issueRsvpSession(event, { casamentoId: guest.casamento_id, conviteId: guest.convite_id })

  return buildRsvpInvitePayload(client, guest.casamento_id, guest.convite_id)
})
