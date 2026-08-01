import { serverSupabaseClient } from '#supabase/server'

const ALL_EXTENSIONS = ['jpg', 'png', 'webp']

/** Remove a foto da seção "Nossa História" — sempre opcional, independente da foto de capa. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)

  await client.storage
    .from('wedding-covers')
    .remove(ALL_EXTENSIONS.map((ext) => `${weddingId}/story.${ext}`))

  const { data: current, error: fetchError } = await client
    .from('weddings')
    .select('theme_config')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const themeConfig = { ...(current.theme_config as Record<string, unknown>) }
  delete themeConfig.storyImageUrl

  const { error: updateError } = await client
    .from('weddings')
    .update({ theme_config: themeConfig })
    .eq('id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.story_remove',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return { removed: true }
})
