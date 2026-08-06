/**
 * Vitrine pública de presentes (CLAUDE.md, seção 18.2) — sem autenticação,
 * sem token de convite: a página é acessível a qualquer momento pelo link
 * público do casamento, sem exigir um link personalizado por convite (CLAUDE.md,
 * seção 18.2/4.5). Nunca expõe quem reservou/contribuiu o quê para os demais.
 * Resolvido por slug (CLAUDE.md, seção 4.4/33).
 */
export default defineEventHandler(async (event) => {
  const slug = getWeddingSlugParam(event)

  const client = supabaseAdmin(event)

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('id, infinitepay_handle, physical_gift_delivery_mode')
    .eq('slug', slug)
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

  const { data: categories, error: categoriesError } = await client
    .from('gift_categories')
    .select('id, name')
    .eq('wedding_id', wedding.id)

  if (categoriesError) {
    throw badRequestError(categoriesError.message)
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

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

  const hasPixOption = Boolean(wedding.infinitepay_handle)
  const physicalDeliveryMode = wedding.physical_gift_delivery_mode as
    | 'both'
    | 'self_purchase_only'
    | 'payment_only'

  const data = gifts.map((gift) => ({
    id: gift.id,
    title: gift.title,
    description: gift.description,
    priceCents: gift.price_cents,
    imageUrl: gift.image_url,
    categoryId: gift.category_id,
    categoryName: gift.category_id ? (categoryNameById.get(gift.category_id) ?? null) : null,
    isGroupGift: gift.is_group_gift,
    quantityAvailable: gift.quantity_available,
    targetAmountCents: gift.target_amount_cents,
    quotaAmountCents: gift.quota_amount_cents,
    displayStyle: gift.display_style as 'standard' | 'emotional',
    emotionalIcon: gift.emotional_icon,
    collectedAmountCents: gift.is_group_gift ? (collectedByGiftId.get(gift.id) ?? 0) : null,
    hasPixOption,
    physicalDeliveryMode,
  }))

  return { data }
})
