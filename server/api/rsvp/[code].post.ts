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
  const codeHash = hashAccessCode(code)

  const { data: token, error: tokenError } = await client
    .from('guest_access_tokens')
    .select('wedding_id, guest_id, group_id, revoked_at')
    .eq('code_hash', codeHash)
    .maybeSingle()

  if (tokenError) {
    throw badRequestError(tokenError.message)
  }
  if (!token || token.revoked_at) {
    throw notFoundError('Link inválido ou expirado.')
  }

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('rsvp_deadline')
    .eq('id', token.wedding_id)
    .single()

  if (weddingError) {
    throw badRequestError(weddingError.message)
  }

  if (wedding.rsvp_deadline && new Date(wedding.rsvp_deadline).getTime() < Date.now()) {
    throw conflictError('O prazo para confirmar presença já encerrou.')
  }

  const input = await validateBody(event, rsvpSubmitSchema)

  const { data, error } = await client.rpc('confirm_rsvp', {
    p_wedding_id: token.wedding_id,
    p_guest_id: token.guest_id,
    p_group_id: token.group_id,
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
