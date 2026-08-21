import { serverSupabaseClient } from '#supabase/server'

const RECENT_ACTIVITY_LIMIT = 20

/**
 * Lista de presentes do admin + um resumo mínimo de pagamentos online
 * (CLAUDE.md, seção 19/28) — bruto arrecadado e quantidade de falhas ("pago
 * mas não conseguiu reservar/contribuir", que exige ação manual do casal) —
 * e uma atividade recente cross-presente (quem presenteou o quê, mais
 * recente primeiro), útil pra acompanhar o total arrecadado e agradecer
 * sem precisar abrir "Ver reservas" presente por presente. Sem relatório
 * completo (taxas/estornos) — fora de escopo, InfinitePay não documenta
 * esses dados publicamente.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('presentes')
    .select('*')
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .order('created_at', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  const { data: confirmedPayments, error: confirmedError } = await client
    .from('pagamentos_presentes')
    .select('valor_centavos')
    .eq('casamento_id', weddingId)
    .eq('status_pagamento', 'confirmado')
  if (confirmedError) {
    throw badRequestError(confirmedError.message)
  }

  const { count: failedCount, error: failedError } = await client
    .from('pagamentos_presentes')
    .select('id', { count: 'exact', head: true })
    .eq('casamento_id', weddingId)
    .eq('status_pagamento', 'falhou')
  if (failedError) {
    throw badRequestError(failedError.message)
  }

  const giftTitleById = new Map(data.map((gift) => [gift.id, gift.titulo]))
  // Reserva paga vale sempre presentes.preco_centavos (checkout.post.ts nunca
  // aceita outro valor pra reserva) — reservas_presentes em si não guarda
  // valor, então reaproveitamos o preço do próprio presente pra exibir na
  // atividade.
  const giftPriceCentsById = new Map(data.map((gift) => [gift.id, gift.preco_centavos]))

  const { data: reservations, error: reservationsError } = await client
    .from('reservas_presentes')
    .select('id, presente_id, nome_contribuinte, telefone_presenteador, mensagem, reservado_em')
    .eq('casamento_id', weddingId)
    .order('reservado_em', { ascending: false })
    .limit(RECENT_ACTIVITY_LIMIT)
  if (reservationsError) {
    throw badRequestError(reservationsError.message)
  }

  const { data: contributions, error: contributionsError } = await client
    .from('contribuicoes_presentes')
    .select('id, presente_id, nome_contribuinte, telefone_presenteador, valor_centavos, quantidade_cotas, mensagem, contribuido_em')
    .eq('casamento_id', weddingId)
    .order('contribuido_em', { ascending: false })
    .limit(RECENT_ACTIVITY_LIMIT)
  if (contributionsError) {
    throw badRequestError(contributionsError.message)
  }

  const { data: confirmedPaymentLinks } = await client
    .from('pagamentos_presentes')
    .select('reserva_resultante_id, contribuicao_resultante_id')
    .eq('casamento_id', weddingId)
    .eq('status_pagamento', 'confirmado')

  const paidReservationIds = new Set(
    (confirmedPaymentLinks ?? [])
      .map((p) => p.reserva_resultante_id)
      .filter((v): v is string => Boolean(v)),
  )
  const paidContributionIds = new Set(
    (confirmedPaymentLinks ?? [])
      .map((p) => p.contribuicao_resultante_id)
      .filter((v): v is string => Boolean(v)),
  )

  const activity = [
    ...(reservations ?? []).map((r) => {
      const isPaid = paidReservationIds.has(r.id)
      return {
        id: r.id,
        type: 'reservation' as const,
        giftId: r.presente_id,
        giftTitle: giftTitleById.get(r.presente_id) ?? 'Presente removido',
        name: r.nome_contribuinte ?? 'Anônimo',
        phone: r.telefone_presenteador,
        amountCents: isPaid ? (giftPriceCentsById.get(r.presente_id) ?? null) : null,
        quotaCount: null,
        message: r.mensagem,
        isPaid,
        at: r.reservado_em,
      }
    }),
    ...(contributions ?? []).map((c) => ({
      id: c.id,
      type: 'contribution' as const,
      giftId: c.presente_id,
      giftTitle: giftTitleById.get(c.presente_id) ?? 'Presente removido',
      name: c.nome_contribuinte ?? 'Anônimo',
      phone: c.telefone_presenteador,
      amountCents: c.valor_centavos,
      quotaCount: c.quantidade_cotas,
      message: c.mensagem,
      isPaid: paidContributionIds.has(c.id),
      at: c.contribuido_em,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)

  return {
    data,
    paymentsSummary: {
      confirmedTotalCents: (confirmedPayments ?? []).reduce((sum, p) => sum + p.valor_centavos, 0),
      failedCount: failedCount ?? 0,
    },
    activity,
  }
})
