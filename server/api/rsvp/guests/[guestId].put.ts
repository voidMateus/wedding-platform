import { rsvpGuestStatusSchema } from '#shared/schemas/rsvp'

/**
 * Salvamento automático do RSVP (CLAUDE.md, seção 12.1/16.3) — chamado a
 * cada toque em "Estarei lá"/"Não poderei ir". Bloqueia após prazo_rsvp,
 * igual ao antigo fluxo por código.
 */
export default defineEventHandler(async (event) => {
  const guestId = getRouterParam(event, 'guestId')
  if (!guestId) {
    throw badRequestError('id do convidado não informado.')
  }
  const input = await validateBody(event, rsvpGuestStatusSchema)

  const client = supabaseAdmin(event)

  const { data: guest, error: guestError } = await client
    .from('convidados')
    .select('casamento_id, convite_id')
    .eq('id', guestId)
    .is('excluido_em', null)
    .maybeSingle()

  if (guestError) throw badRequestError(guestError.message)
  if (!guest) throw notFoundError('Convidado não encontrado.')

  requireRsvpSessionForInvite(event, guest.convite_id)

  const { data: wedding, error: weddingError } = await client
    .from('casamentos')
    .select('prazo_rsvp')
    .eq('id', guest.casamento_id)
    .single()

  if (weddingError) throw badRequestError(weddingError.message)
  if (wedding.prazo_rsvp && new Date(wedding.prazo_rsvp).getTime() < Date.now()) {
    throw conflictError('O prazo para confirmar presença já encerrou.')
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
  const userAgent = getHeader(event, 'user-agent') ?? null

  const { data, error } = await client.rpc('salvar_rsvp_convidado', {
    p_casamento_id: guest.casamento_id,
    p_convidado_id: guestId,
    p_status: input.status,
    p_restricoes_alimentares: input.restricoesAlimentares || null,
    p_ip: ip,
    p_user_agent: userAgent,
    p_origem: 'public_site',
  })

  if (error) {
    if (error.message.includes('GUEST_WITHOUT_INVITE') || error.message.includes('GUEST_NOT_FOUND')) {
      throw notFoundError('Convidado não encontrado.')
    }
    throw badRequestError(error.message)
  }

  return data
})
