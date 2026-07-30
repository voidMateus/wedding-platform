import { serverSupabaseClient } from '#supabase/server'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, eventSegmentInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('event_segments')
    .insert({
      wedding_id: weddingId,
      title: input.title,
      venue_name: input.venueName || null,
      venue_address: input.venueAddress || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      display_order: input.displayOrder,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'event_segment.create',
    entityType: 'event_segment',
    entityId: data.id,
    metadata: { title: data.title },
  })

  setResponseStatus(event, 201)
  return data
})
