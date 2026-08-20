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

  // O modo de entrega (CLAUDE.md, seção 18.2) é decidido pelo casal e só era
  // respeitado pela UI (GiftCard.vue esconde o botão) — reforçado aqui pra
  // uma chamada direta a este endpoint não conseguir contornar 'payment_only'
  // (achado de segurança, varredura de 2026-08-19).
  const { data: gift, error: giftError } = await client
    .from('gifts')
    .select('wedding_id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (giftError) throw badRequestError(giftError.message)
  if (!gift) throw notFoundError('Presente não encontrado.')

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('physical_gift_delivery_mode')
    .eq('id', gift.wedding_id)
    .single()

  if (weddingError) throw badRequestError(weddingError.message)
  if (wedding.physical_gift_delivery_mode === 'payment_only') {
    throw badRequestError('Este presente só pode ser presenteado via pagamento online.')
  }

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
