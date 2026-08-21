import { serverSupabaseClient } from '#supabase/server'

const ALL_EXTENSIONS = ['jpg', 'png', 'webp']

/** Remove a foto de capa — a foto é sempre opcional, o casal pode voltar ao estado sem foto. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)

  await client.storage
    .from('wedding-covers')
    .remove(ALL_EXTENSIONS.map((ext) => `${weddingId}/cover.${ext}`))

  const { data: current, error: fetchError } = await client
    .from('casamentos')
    .select('config_tema')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const themeConfig = { ...(current.config_tema as Record<string, unknown>) }
  delete themeConfig.coverImageUrl
  delete themeConfig.coverFocalX
  delete themeConfig.coverFocalY

  const { error: updateError } = await client
    .from('casamentos')
    .update({ config_tema: themeConfig })
    .eq('id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.cover_remove',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return { removed: true }
})
