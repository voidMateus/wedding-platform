import { giftReserveSchema } from '#shared/schemas/gift-mutations'

/**
 * Reserva atômica de um presente simples (CLAUDE.md, seção 18.3) — delega ao
 * RPC reserve_gift (SELECT...FOR UPDATE + decremento + insert na mesma
 * transação), nunca um check-then-insert feito aqui.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }
  const input = await validateBody(event, giftReserveSchema)

  const client = supabaseAdmin(event)
  const token = await resolveGuestToken(client, input.code)
  if (!token) {
    throw notFoundError('Link inválido ou expirado.')
  }

  const { data, error } = await client.rpc('reserve_gift', {
    p_gift_id: id,
    p_guest_id: token.guestId,
    p_group_id: token.groupId,
    p_contributor_name: null,
  })

  if (error) {
    if (error.message.includes('GIFT_NOT_FOUND')) {
      throw notFoundError('Presente não encontrado.')
    }
    if (error.message.includes('GIFT_UNAVAILABLE')) {
      throw conflictError('Este presente já foi reservado por outra pessoa.')
    }
    if (error.message.includes('GIFT_IS_GROUP_GIFT')) {
      throw badRequestError('Este presente é de cota — use contribuição, não reserva.')
    }
    if (error.message.includes('NOT_IN_WEDDING')) {
      throw forbiddenError()
    }
    throw badRequestError(error.message)
  }

  return data
})
