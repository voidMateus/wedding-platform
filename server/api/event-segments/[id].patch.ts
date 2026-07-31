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

  const sameVenueAs = input.sameVenueAs || null
  if (sameVenueAs) {
    await validateSameVenueTarget(client, weddingId, sameVenueAs, id)
  }

  const { data, error } = await client
    .from('event_segments')
    .update({
      title: input.title,
      venue_name: sameVenueAs ? null : input.venueName || null,
      venue_address: sameVenueAs ? null : input.venueAddress || null,
      venue_latitude: sameVenueAs ? null : (input.venueLatitude ?? null),
      venue_longitude: sameVenueAs ? null : (input.venueLongitude ?? null),
      same_venue_as: sameVenueAs,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      display_order: input.displayOrder,
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
