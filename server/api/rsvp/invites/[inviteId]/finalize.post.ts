import { rsvpFinalizeSchema } from '#shared/schemas/rsvp'

/**
 * Etapa final de revisão do RSVP (CLAUDE.md, seção 12.1/16.3) — acompanhante
 * avulso (só modo_lista_convidados='aberta') + mensagem única ao casal.
 */
export default defineEventHandler(async (event) => {
  const inviteId = getRouterParam(event, 'inviteId')
  if (!inviteId) {
    throw badRequestError('id do convite não informado.')
  }
  const input = await validateBody(event, rsvpFinalizeSchema)

  const client = supabaseAdmin(event)

  const { data: invite, error: inviteError } = await client
    .from('convites')
    .select('casamento_id')
    .eq('id', inviteId)
    .is('excluido_em', null)
    .maybeSingle()

  if (inviteError) throw badRequestError(inviteError.message)
  if (!invite) throw notFoundError('Convite não encontrado.')

  requireRsvpSessionForInvite(event, inviteId)

  const { data: wedding, error: weddingError } = await client
    .from('casamentos')
    .select('prazo_rsvp')
    .eq('id', invite.casamento_id)
    .single()

  if (weddingError) throw badRequestError(weddingError.message)
  if (wedding.prazo_rsvp && new Date(wedding.prazo_rsvp).getTime() < Date.now()) {
    throw conflictError('O prazo para confirmar presença já encerrou.')
  }

  const { data, error } = await client.rpc('finalizar_rsvp_convite', {
    p_casamento_id: invite.casamento_id,
    p_convite_id: inviteId,
    p_acompanhantes: input.companions,
    p_mensagem: input.message || null,
    p_origem: 'public_site',
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
