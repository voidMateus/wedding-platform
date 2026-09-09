import { serverSupabaseClient } from '#supabase/server'

const ALL_EXTENSIONS = ['jpg', 'png', 'webp']

/**
 * Remove o monograma enviado. O site não fica sem monograma: volta a desenhar
 * as iniciais derivadas do nome do casal (PublicMonogram), que é o
 * comportamento normal de quem nunca enviou uma arte.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)

  await client.storage
    .from('wedding-covers')
    .remove(ALL_EXTENSIONS.map((ext) => `${weddingId}/monogram.${ext}`))

  const { data: current, error: fetchError } = await client
    .from('casamentos')
    .select('config_tema')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const themeConfig = { ...(current.config_tema as Record<string, unknown>) }
  delete themeConfig.monogramImageUrl

  const { error: updateError } = await client
    .from('casamentos')
    .update({ config_tema: themeConfig })
    .eq('id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.monogram_remove',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return { removed: true }
})
