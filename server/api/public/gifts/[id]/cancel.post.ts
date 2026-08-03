import { giftCancelSchema } from '#shared/schemas/gift-mutations'

/**
 * Cancela a reserva (presente simples) ou remove as contribuições (presente
 * de cota) do próprio convidado/grupo resolvido pelo token — nunca confia em
 * um id de reserva/contribuição isolado sem essa checagem de posse
 * (CLAUDE.md, seção 18.3).
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }
  const input = await validateBody(event, giftCancelSchema)

  const client = supabaseAdmin(event)
  const token = await resolveGuestToken(client, input.code)
  if (!token) {
    throw notFoundError('Link inválido ou expirado.')
  }

  const { data: gift, error: giftError } = await client
    .from('gifts')
    .select('id, is_group_gift')
    .eq('id', id)
    .eq('wedding_id', token.weddingId)
    .maybeSingle()

  if (giftError) {
    throw badRequestError(giftError.message)
  }
  if (!gift) {
    throw notFoundError('Presente não encontrado.')
  }

  const identifierColumn = 'group_id'
  const identifierValue = token.inviteId

  if (gift.is_group_gift) {
    const { error } = await client
      .from('gift_contributions')
      .delete()
      .eq('gift_id', id)
      .eq(identifierColumn, identifierValue)

    if (error) {
      throw badRequestError(error.message)
    }

    return { id }
  }

  const { data: reservation, error: reservationError } = await client
    .from('gift_reservations')
    .select('id')
    .eq('gift_id', id)
    .eq(identifierColumn, identifierValue)
    .maybeSingle()

  if (reservationError) {
    throw badRequestError(reservationError.message)
  }
  if (!reservation) {
    throw notFoundError('Você não tem uma reserva para este presente.')
  }

  const { error: cancelError } = await client.rpc('cancel_gift_reservation', {
    p_reservation_id: reservation.id,
    p_guest_id: null,
    p_group_id: token.inviteId,
    p_skip_ownership_check: false,
  })

  if (cancelError) {
    throw badRequestError(cancelError.message)
  }

  return { id }
})
