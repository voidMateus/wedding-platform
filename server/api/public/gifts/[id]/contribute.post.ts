import { giftContributeSchema } from '#shared/schemas/gift-mutations'

/**
 * Contribuição parcial em um presente de cota (CLAUDE.md, seção 18.3) — sem
 * SELECT...FOR UPDATE: contribuições não competem por um recurso exclusivo,
 * apenas somam. O valor "arrecadado" é sempre lido por agregação (ver
 * server/api/public/gifts/index.get.ts), nunca um contador mantido à parte.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }
  const input = await validateBody(event, giftContributeSchema)

  const client = supabaseAdmin(event)
  const token = await resolveGuestToken(client, input.code)
  if (!token) {
    throw notFoundError('Link inválido ou expirado.')
  }

  const { data: gift, error: giftError } = await client
    .from('gifts')
    .select('id, wedding_id, is_group_gift')
    .eq('id', id)
    .eq('wedding_id', token.weddingId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .maybeSingle()

  if (giftError) {
    throw badRequestError(giftError.message)
  }
  if (!gift) {
    throw notFoundError('Presente não encontrado.')
  }
  if (!gift.is_group_gift) {
    throw badRequestError('Este presente é simples — use reserva, não contribuição.')
  }

  const { data, error } = await client
    .from('gift_contributions')
    .insert({
      wedding_id: token.weddingId,
      gift_id: id,
      guest_id: token.guestId,
      group_id: token.groupId,
      amount_cents: input.amountCents,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  return data
})
