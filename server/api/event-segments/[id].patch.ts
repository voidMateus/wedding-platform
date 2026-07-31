import { serverSupabaseClient } from '#supabase/server'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do item do cronograma não informado.')
  }
  const input = await validateBody(event, eventSegmentInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('event_segments')
    .update({
      title: input.title,
      venue_name: input.venueName || null,
      venue_address: input.venueAddress || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      display_order: input.displayOrder,
      venue_latitude: input.venueLatitude ?? null,
      venue_longitude: input.venueLongitude ?? null,
    })
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Item do cronograma não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'event_segment.update',
    entityType: 'event_segment',
    entityId: data.id,
    metadata: { title: data.title },
  })

  return data
})
