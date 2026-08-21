import { giftReserveSchema } from '#shared/schemas/gift-mutations'

/**
 * Reserva atômica de um presente simples (CLAUDE.md, seção 18.3) — delega ao
 * RPC reservar_presente (SELECT...FOR UPDATE + decremento + insert na mesma
 * transação), nunca um check-then-insert feito aqui.
 *
 * Sem token de convite (CLAUDE.md, seção 18.2/4.5) — identificação é só
 * nomePresenteador/telefonePresenteador, coletados no modal antes desta
 * chamada.
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
  // uma chamada direta a este endpoint não conseguir contornar
  // 'somente_pagamento' (achado de segurança, varredura de 2026-08-19).
  const { data: gift, error: giftError } = await client
    .from('presentes')
    .select('casamento_id')
    .eq('id', id)
    .is('excluido_em', null)
    .maybeSingle()

  if (giftError) throw badRequestError(giftError.message)
  if (!gift) throw notFoundError('Presente não encontrado.')

  const { data: wedding, error: weddingError } = await client
    .from('casamentos')
    .select('modo_entrega_presente_fisico')
    .eq('id', gift.casamento_id)
    .single()

  if (weddingError) throw badRequestError(weddingError.message)
  if (wedding.modo_entrega_presente_fisico === 'somente_pagamento') {
    throw badRequestError('Este presente só pode ser presenteado via pagamento online.')
  }

  const { data, error } = await client.rpc('reservar_presente', {
    p_presente_id: id,
    p_convidado_id: null,
    p_convite_id: null,
    p_nome_contribuinte: input.nomePresenteador,
    p_mensagem: input.message || null,
    p_telefone_presenteador: input.telefonePresenteador || null,
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
