/**
 * Vitrine pública de presentes (CLAUDE.md, seção 18.2) — sem autenticação,
 * sem token obrigatório. Se um `code` for informado na query, a resposta é
 * personalizada com o que o próprio convidado já reservou/contribuiu, sem
 * nunca expor quem reservou o quê para os demais (CLAUDE.md, seção 18.2).
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : undefined

  const client = supabaseAdmin(event)

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('id')
    .limit(1)
    .single()

  if (weddingError) {
    throw notFoundError('Casamento não encontrado.')
  }

  const { data: gifts, error: giftsError } = await client
    .from('gifts')
    .select('*')
    .eq('wedding_id', wedding.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (giftsError) {
    throw badRequestError(giftsError.message)
  }

  const groupGiftIds = gifts.filter((g) => g.is_group_gift).map((g) => g.id)

  const collectedByGiftId = new Map<string, number>()
  if (groupGiftIds.length > 0) {
    const { data: contributions, error: contributionsError } = await client
      .from('gift_contributions')
      .select('gift_id, amount_cents')
      .in('gift_id', groupGiftIds)

    if (contributionsError) {
      throw badRequestError(contributionsError.message)
    }

    for (const contribution of contributions ?? []) {
      collectedByGiftId.set(
        contribution.gift_id,
        (collectedByGiftId.get(contribution.gift_id) ?? 0) + contribution.amount_cents,
      )
    }
  }

  let token = null
  if (code) {
    token = await resolveGuestToken(client, code)
  }

  const reservedGiftIds = new Set<string>()
  const contributedByGiftId = new Map<string, number>()

  if (token) {
    const identifierColumn = token.guestId ? 'guest_id' : 'group_id'
    const identifierValue = token.guestId ?? (token.groupId as string)

    const { data: myReservations, error: myReservationsError } = await client
      .from('gift_reservations')
      .select('gift_id')
      .eq(identifierColumn, identifierValue)
    if (myReservationsError) {
      throw badRequestError(myReservationsError.message)
    }
    for (const reservation of myReservations ?? []) {
      reservedGiftIds.add(reservation.gift_id)
    }

    const { data: myContributions, error: myContributionsError } = await client
      .from('gift_contributions')
      .select('gift_id, amount_cents')
      .eq(identifierColumn, identifierValue)
    if (myContributionsError) {
      throw badRequestError(myContributionsError.message)
    }
    for (const contribution of myContributions ?? []) {
      contributedByGiftId.set(
        contribution.gift_id,
        (contributedByGiftId.get(contribution.gift_id) ?? 0) + contribution.amount_cents,
      )
    }
  }

  const data = gifts.map((gift) => ({
    id: gift.id,
    title: gift.title,
    description: gift.description,
    priceCents: gift.price_cents,
    imageUrl: gift.image_url,
    categoryId: gift.category_id,
    isGroupGift: gift.is_group_gift,
    quantityAvailable: gift.quantity_available,
    targetAmountCents: gift.target_amount_cents,
    collectedAmountCents: gift.is_group_gift ? (collectedByGiftId.get(gift.id) ?? 0) : null,
    reservedByMe: reservedGiftIds.has(gift.id),
    contributedByMeCents: gift.is_group_gift ? (contributedByGiftId.get(gift.id) ?? 0) : null,
  }))

  return { data }
})
