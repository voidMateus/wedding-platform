import { serverSupabaseClient } from '#supabase/server'
import { weddingSettingsSchema } from '#shared/schemas/wedding'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, weddingSettingsSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('weddings')
    .update({
      couple_names: input.coupleNames,
      event_date: input.eventDate,
      event_time: input.eventTime || null,
      rsvp_mode: input.rsvpMode,
      rsvp_deadline: input.rsvpDeadline || null,
    })
    .eq('id', weddingId)
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.update',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return data
})
