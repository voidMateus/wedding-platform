import { serverSupabaseClient } from '#supabase/server'
import { weddingSettingsSchema } from '#shared/schemas/wedding'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, weddingSettingsSchema)

  const client = await serverSupabaseClient(event)

  // Preserva outras chaves de theme_config (ex.: fonte, foto de capa) que
  // esta tela ainda não gerencia — nunca sobrescreve o objeto inteiro.
  const { data: current, error: fetchError } = await client
    .from('weddings')
    .select('theme_config')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const themeConfig = {
    ...(current.theme_config as Record<string, unknown>),
    primaryColor: input.primaryColor,
  }

  const { data, error } = await client
    .from('weddings')
    .update({
      couple_names: input.coupleNames,
      event_date: input.eventDate,
      rsvp_mode: input.rsvpMode,
      rsvp_deadline: input.rsvpDeadline || null,
      theme_config: themeConfig,
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
