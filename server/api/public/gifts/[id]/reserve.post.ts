import { giftReserveSchema } from '#shared/schemas/gift-mutations'

/**
 * Reserva atômica de um presente simples (CLAUDE.md, seção 18.3) — delega ao
 * RPC reserve_gift (SELECT...FOR UPDATE + decremento + insert na mesma
 * transação), nunca um check-then-insert feito aqui.
 *
 * Sem token de convite (CLAUDE.md, seção 18.2/4.5) — identificação é só
 * giverName/giverPhone, coletados no modal antes desta chamada.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }
  const input = await validateBody(event, giftReserveSchema)

  const client = supabaseAdmin(event)

  const { data, error } = await client.rpc('reserve_gift', {
    p_gift_id: id,
    p_guest_id: null,
    p_group_id: null,
    p_contributor_name: input.giverName,
    p_message: input.message || null,
    p_giver_phone: input.giverPhone || null,
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
