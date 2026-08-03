import { rsvpGuestStatusSchema } from '#shared/schemas/rsvp'

/**
 * Salvamento automático do RSVP (CLAUDE.md, seção 12.1/16.3) — chamado a
 * cada toque em "Estarei lá"/"Não poderei ir". Bloqueia após rsvp_deadline,
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
    .from('guests')
    .select('wedding_id')
    .eq('id', guestId)
    .is('deleted_at', null)
    .maybeSingle()

  if (guestError) throw badRequestError(guestError.message)
  if (!guest) throw notFoundError('Convidado não encontrado.')

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('rsvp_deadline')
    .eq('id', guest.wedding_id)
    .single()

  if (weddingError) throw badRequestError(weddingError.message)
  if (wedding.rsvp_deadline && new Date(wedding.rsvp_deadline).getTime() < Date.now()) {
    throw conflictError('O prazo para confirmar presença já encerrou.')
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
  const userAgent = getHeader(event, 'user-agent') ?? null

  const { data, error } = await client.rpc('upsert_guest_rsvp', {
    p_wedding_id: guest.wedding_id,
    p_guest_id: guestId,
    p_status: input.status,
    p_dietary_restrictions: input.dietaryRestrictions || null,
    p_ip: ip,
    p_user_agent: userAgent,
    p_source: 'public_site',
  })

  if (error) {
    if (error.message.includes('GUEST_WITHOUT_INVITE') || error.message.includes('GUEST_NOT_FOUND')) {
      throw notFoundError('Convidado não encontrado.')
    }
    throw badRequestError(error.message)
  }

  return data
})
