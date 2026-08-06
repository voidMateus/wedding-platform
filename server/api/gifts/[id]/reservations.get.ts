import { serverSupabaseClient } from '#supabase/server'

/**
 * Quem reservou/contribuiu com o quê (CLAUDE.md, seção 18.3/19.2) — só
 * visível ao painel administrativo, nunca na vitrine pública.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data: gift, error: giftError } = await client
    .from('gifts')
    .select('id')
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .maybeSingle()
  if (giftError) {
    throw badRequestError(giftError.message)
  }
  if (!gift) {
    throw notFoundError('Presente não encontrado.')
  }

  const { data: reservations, error: reservationsError } = await client
    .from('gift_reservations')
    .select('id, guest_id, group_id, contributor_name, giver_phone, reserved_at, message')
    .eq('gift_id', id)
    .order('reserved_at', { ascending: true })
  if (reservationsError) {
    throw badRequestError(reservationsError.message)
  }

  const { data: contributions, error: contributionsError } = await client
    .from('gift_contributions')
    .select('id, guest_id, group_id, contributor_name, giver_phone, amount_cents, contributed_at, message, quota_count')
    .eq('gift_id', id)
    .order('contributed_at', { ascending: true })
  if (contributionsError) {
    throw badRequestError(contributionsError.message)
  }

  const { data: confirmedPayments } = await client
    .from('gift_payments')
    .select('resulting_reservation_id, resulting_contribution_id')
    .eq('gift_id', id)
    .eq('status', 'confirmed')

  const paidReservationIds = new Set(
    (confirmedPayments ?? []).map((p) => p.resulting_reservation_id).filter((v): v is string => Boolean(v)),
  )
  const paidContributionIds = new Set(
    (confirmedPayments ?? []).map((p) => p.resulting_contribution_id).filter((v): v is string => Boolean(v)),
  )

  const guestIds = [
    ...(reservations ?? []).map((r) => r.guest_id),
    ...(contributions ?? []).map((c) => c.guest_id),
  ].filter((v): v is string => Boolean(v))
  const groupIds = [
    ...(reservations ?? []).map((r) => r.group_id),
    ...(contributions ?? []).map((c) => c.group_id),
  ].filter((v): v is string => Boolean(v))

  const guestNames = new Map<string, string>()
  if (guestIds.length > 0) {
    const { data } = await client.from('guests').select('id, full_name').in('id', guestIds)
    for (const g of data ?? []) guestNames.set(g.id, g.full_name)
  }

  const groupNames = new Map<string, string>()
  if (groupIds.length > 0) {
    const { data } = await client.from('invites').select('id, name').in('id', groupIds)
    for (const g of data ?? []) groupNames.set(g.id, g.name)
  }

  // contributor_name é o nome da pessoa específica que presenteou (coletada
  // no passo de identificação, CLAUDE.md seção 18) — sempre preferido sobre
  // o nome do convidado/convite, que hoje é só o rótulo do grupo (ex.:
  // "Família Silva"), não da pessoa. inviteName fica como contexto adicional.
  function resolveName(
    guestId: string | null,
    groupId: string | null,
    contributorName: string | null,
  ) {
    if (contributorName) return contributorName
    if (guestId) return guestNames.get(guestId) ?? 'Convidado removido'
    if (groupId) return groupNames.get(groupId) ?? 'Convite removido'
    return 'Anônimo'
  }

  function resolveInviteName(groupId: string | null) {
    return groupId ? (groupNames.get(groupId) ?? 'Convite removido') : null
  }

  return {
    reservations: (reservations ?? []).map((r) => ({
      id: r.id,
      name: resolveName(r.guest_id, r.group_id, r.contributor_name),
      inviteName: resolveInviteName(r.group_id),
      phone: r.giver_phone,
      reservedAt: r.reserved_at,
      message: r.message,
      isPaid: paidReservationIds.has(r.id),
    })),
    contributions: (contributions ?? []).map((c) => ({
      id: c.id,
      name: resolveName(c.guest_id, c.group_id, c.contributor_name),
      inviteName: resolveInviteName(c.group_id),
      phone: c.giver_phone,
      amountCents: c.amount_cents,
      contributedAt: c.contributed_at,
      message: c.message,
      quotaCount: c.quota_count,
      isPaid: paidContributionIds.has(c.id),
    })),
  }
})
