import { rsvpSubmitSchema } from '#shared/schemas/rsvp'

/**
 * Submete/atualiza a resposta de RSVP (CLAUDE.md, seção 16.4 — editável até
 * rsvp_deadline, upsert idempotente pelo guest_id/group_id resolvido do
 * token). Delega a concorrência contra guest_groups.max_members para a
 * função transacional confirm_rsvp() (CLAUDE.md, seção 13/16.4/17.3) — nunca
 * um check-then-insert feito aqui.
 *
 * Rate limiting (CLAUDE.md, seção 14.5/28) é aplicado em
 * server/middleware/rate-limit.ts para todo /api/rsvp/**, não neste handler.
 */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  if (!code) {
    throw badRequestError('Código não informado.')
  }

  const client = supabaseAdmin(event)
  const token = await resolveGuestToken(client, code)
  if (!token) {
    throw notFoundError('Link inválido ou expirado.')
  }

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('rsvp_deadline')
    .eq('id', token.weddingId)
    .single()

  if (weddingError) {
    throw badRequestError(weddingError.message)
  }

  if (wedding.rsvp_deadline && new Date(wedding.rsvp_deadline).getTime() < Date.now()) {
    throw conflictError('O prazo para confirmar presença já encerrou.')
  }

  const input = await validateBody(event, rsvpSubmitSchema)

  const { data, error } = await client.rpc('confirm_rsvp', {
    p_wedding_id: token.weddingId,
    p_guest_id: token.guestId,
    p_group_id: token.groupId,
    p_status: input.status,
    p_dietary_notes: input.dietaryNotes || null,
    p_message: input.message || null,
    p_companions: input.status === 'confirmed' ? input.companions : [],
  })

  if (error) {
    if (error.message.includes('GROUP_LIMIT_EXCEEDED')) {
      throw conflictError('O limite de acompanhantes do grupo foi atingido.')
    }
    if (error.message.includes('GROUP_NOT_FOUND') || error.message.includes('GUEST_NOT_FOUND')) {
      throw notFoundError('Convidado ou grupo não encontrado.')
    }
    throw badRequestError(error.message)
  }

  return data
})
