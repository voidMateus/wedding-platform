import { serverSupabaseClient } from '#supabase/server'
import { giftInputSchema } from '#shared/schemas/gifts'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }
  const input = await validateBody(event, giftInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('gifts')
    .update({
      category_id: input.categoryId || null,
      title: input.title,
      description: input.description || null,
      price_cents: input.priceCents ?? null,
      image_url: input.imageUrl || null,
      is_group_gift: input.isGroupGift,
      quantity_available: input.isGroupGift ? null : (input.quantityAvailable ?? 0),
      target_amount_cents: input.isGroupGift ? (input.targetAmountCents ?? null) : null,
      quota_amount_cents: input.isGroupGift ? (input.quotaAmountCents ?? null) : null,
      display_style: input.isGroupGift ? input.displayStyle : 'standard',
      emotional_icon: input.displayStyle === 'emotional' ? input.emotionalIcon || null : null,
      is_active: input.isActive,
    })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Presente não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift.update',
    entityType: 'gift',
    entityId: id,
    metadata: { title: data.title },
  })

  return data
})
