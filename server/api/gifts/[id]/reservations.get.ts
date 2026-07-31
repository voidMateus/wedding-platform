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
    .select('id, guest_id, group_id, contributor_name, reserved_at')
    .eq('gift_id', id)
    .order('reserved_at', { ascending: true })
  if (reservationsError) {
    throw badRequestError(reservationsError.message)
  }

  const { data: contributions, error: contributionsError } = await client
    .from('gift_contributions')
    .select('id, guest_id, group_id, contributor_name, amount_cents, contributed_at')
    .eq('gift_id', id)
    .order('contributed_at', { ascending: true })
  if (contributionsError) {
    throw badRequestError(contributionsError.message)
  }

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
    const { data } = await client.from('guest_groups').select('id, name').in('id', groupIds)
    for (const g of data ?? []) groupNames.set(g.id, g.name)
  }

  function resolveName(guestId: string | null, groupId: string | null, contributorName: string | null) {
    if (guestId) return guestNames.get(guestId) ?? 'Convidado removido'
    if (groupId) return groupNames.get(groupId) ?? 'Grupo removido'
    return contributorName ?? 'Anônimo'
  }

  return {
    reservations: (reservations ?? []).map((r) => ({
      id: r.id,
      name: resolveName(r.guest_id, r.group_id, r.contributor_name),
      reservedAt: r.reserved_at,
    })),
    contributions: (contributions ?? []).map((c) => ({
      id: c.id,
      name: resolveName(c.guest_id, c.group_id, c.contributor_name),
      amountCents: c.amount_cents,
      contributedAt: c.contributed_at,
    })),
  }
})
