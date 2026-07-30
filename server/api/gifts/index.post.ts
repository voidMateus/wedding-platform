import { serverSupabaseClient } from '#supabase/server'
import { giftInputSchema } from '#shared/schemas/gifts'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, giftInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('gifts')
    .insert({
      wedding_id: weddingId,
      category_id: input.categoryId || null,
      title: input.title,
      description: input.description || null,
      price_cents: input.priceCents ?? null,
      image_url: input.imageUrl || null,
      is_group_gift: input.isGroupGift,
      // Espelha o CHECK gifts_mode_fields — nunca os dois preenchidos ao
      // mesmo tempo (CLAUDE.md, seção 12.2).
      quantity_available: input.isGroupGift ? null : (input.quantityAvailable ?? 0),
      target_amount_cents: input.isGroupGift ? (input.targetAmountCents ?? null) : null,
      is_active: input.isActive,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift.create',
    entityType: 'gift',
    entityId: data.id,
    metadata: { title: data.title },
  })

  setResponseStatus(event, 201)
  return data
})
