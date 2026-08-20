import { rsvpFinalizeSchema } from '#shared/schemas/rsvp'

/**
 * Etapa final de revisão do RSVP (CLAUDE.md, seção 12.1/16.3) — acompanhante
 * avulso (só guest_list_mode='open') + mensagem única ao casal.
 */
export default defineEventHandler(async (event) => {
  const inviteId = getRouterParam(event, 'inviteId')
  if (!inviteId) {
    throw badRequestError('id do convite não informado.')
  }
  const input = await validateBody(event, rsvpFinalizeSchema)

  const client = supabaseAdmin(event)

  const { data: invite, error: inviteError } = await client
    .from('invites')
    .select('wedding_id')
    .eq('id', inviteId)
    .is('deleted_at', null)
    .maybeSingle()

  if (inviteError) throw badRequestError(inviteError.message)
  if (!invite) throw notFoundError('Convite não encontrado.')

  requireRsvpSessionForInvite(event, inviteId)

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('rsvp_deadline')
    .eq('id', invite.wedding_id)
    .single()

  if (weddingError) throw badRequestError(weddingError.message)
  if (wedding.rsvp_deadline && new Date(wedding.rsvp_deadline).getTime() < Date.now()) {
    throw conflictError('O prazo para confirmar presença já encerrou.')
  }

  const { data, error } = await client.rpc('finalize_invite_rsvp', {
    p_wedding_id: invite.wedding_id,
    p_invite_id: inviteId,
    p_companions: input.companions,
    p_message: input.message || null,
    p_source: 'public_site',
  })

  if (error) {
    if (error.message.includes('MAX_COMPANIONS_EXCEEDED')) {
      throw conflictError('O limite de acompanhantes deste convite foi atingido.')
    }
    if (error.message.includes('INVITE_NOT_FOUND')) {
      throw notFoundError('Convite não encontrado.')
    }
    throw badRequestError(error.message)
  }

  return data
})
