import { serverSupabaseClient } from '#supabase/server'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, eventSegmentInputSchema)

  const client = await serverSupabaseClient(event)

  const sameVenueAs = input.sameVenueAs || null
  if (sameVenueAs) {
    await validateSameVenueTarget(client, weddingId, sameVenueAs)
  }

  const { data, error } = await client
    .from('event_segments')
    .insert({
      wedding_id: weddingId,
      title: input.title,
      // Com same_venue_as definido, este registro nunca guarda seu próprio
      // local — evita duas fontes de verdade divergentes (CLAUDE.md, 12.2).
      venue_name: sameVenueAs ? null : input.venueName || null,
      venue_address: sameVenueAs ? null : input.venueAddress || null,
      venue_latitude: sameVenueAs ? null : (input.venueLatitude ?? null),
      venue_longitude: sameVenueAs ? null : (input.venueLongitude ?? null),
      same_venue_as: sameVenueAs,
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
