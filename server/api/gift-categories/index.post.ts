import { serverSupabaseClient } from '#supabase/server'
import { giftCategoryInputSchema } from '#shared/schemas/gift-categories'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, giftCategoryInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('gift_categories')
    .insert({
      wedding_id: weddingId,
      name: input.name,
      display_order: input.displayOrder,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift_category.create',
    entityType: 'gift_category',
    entityId: data.id,
    metadata: { name: data.name },
  })

  setResponseStatus(event, 201)
  return data
})
