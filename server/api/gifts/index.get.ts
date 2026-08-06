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
    .from('gifts')
    .select('*')
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  const { data: confirmedPayments, error: confirmedError } = await client
    .from('gift_payments')
    .select('amount_cents')
    .eq('wedding_id', weddingId)
    .eq('status', 'confirmed')
  if (confirmedError) {
    throw badRequestError(confirmedError.message)
  }

  const { count: failedCount, error: failedError } = await client
    .from('gift_payments')
    .select('id', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .eq('status', 'failed')
  if (failedError) {
    throw badRequestError(failedError.message)
  }

  const giftTitleById = new Map(data.map((gift) => [gift.id, gift.title]))
  // Reserva paga vale sempre gifts.price_cents (checkout.post.ts nunca aceita
  // outro valor pra reserva) — gift_reservations em si não guarda valor,
  // então reaproveitamos o preço do próprio presente pra exibir na atividade.
  const giftPriceCentsById = new Map(data.map((gift) => [gift.id, gift.price_cents]))

  const { data: reservations, error: reservationsError } = await client
    .from('gift_reservations')
    .select('id, gift_id, contributor_name, giver_phone, message, reserved_at')
    .eq('wedding_id', weddingId)
    .order('reserved_at', { ascending: false })
    .limit(RECENT_ACTIVITY_LIMIT)
  if (reservationsError) {
    throw badRequestError(reservationsError.message)
  }

  const { data: contributions, error: contributionsError } = await client
    .from('gift_contributions')
    .select('id, gift_id, contributor_name, giver_phone, amount_cents, quota_count, message, contributed_at')
    .eq('wedding_id', weddingId)
    .order('contributed_at', { ascending: false })
    .limit(RECENT_ACTIVITY_LIMIT)
  if (contributionsError) {
    throw badRequestError(contributionsError.message)
  }

  const { data: confirmedPaymentLinks } = await client
    .from('gift_payments')
    .select('resulting_reservation_id, resulting_contribution_id')
    .eq('wedding_id', weddingId)
    .eq('status', 'confirmed')

  const paidReservationIds = new Set(
    (confirmedPaymentLinks ?? [])
      .map((p) => p.resulting_reservation_id)
      .filter((v): v is string => Boolean(v)),
  )
  const paidContributionIds = new Set(
    (confirmedPaymentLinks ?? [])
      .map((p) => p.resulting_contribution_id)
      .filter((v): v is string => Boolean(v)),
  )

  const activity = [
    ...(reservations ?? []).map((r) => {
      const isPaid = paidReservationIds.has(r.id)
      return {
        id: r.id,
        type: 'reservation' as const,
        giftId: r.gift_id,
        giftTitle: giftTitleById.get(r.gift_id) ?? 'Presente removido',
        name: r.contributor_name ?? 'Anônimo',
        phone: r.giver_phone,
        amountCents: isPaid ? (giftPriceCentsById.get(r.gift_id) ?? null) : null,
        quotaCount: null,
        message: r.message,
        isPaid,
        at: r.reserved_at,
      }
    }),
    ...(contributions ?? []).map((c) => ({
      id: c.id,
      type: 'contribution' as const,
      giftId: c.gift_id,
      giftTitle: giftTitleById.get(c.gift_id) ?? 'Presente removido',
      name: c.contributor_name ?? 'Anônimo',
      phone: c.giver_phone,
      amountCents: c.amount_cents,
      quotaCount: c.quota_count,
      message: c.message,
      isPaid: paidContributionIds.has(c.id),
      at: c.contributed_at,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)

  return {
    data,
    paymentsSummary: {
      confirmedTotalCents: (confirmedPayments ?? []).reduce((sum, p) => sum + p.amount_cents, 0),
      failedCount: failedCount ?? 0,
    },
    activity,
  }
})
