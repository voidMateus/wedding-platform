import { serverSupabaseClient } from '#supabase/server'

const ALL_EXTENSIONS = ['jpg', 'png', 'webp']

/**
 * Remove a imagem do Dress Code. A seção não fica "quebrada" sem ela: volta ao
 * estado padrão, só com o texto e os cartões de sugestão — que é como ela
 * nasce para todo casamento que nunca enviou imagem nenhuma.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)

  await client.storage
    .from('wedding-covers')
    .remove(ALL_EXTENSIONS.map((ext) => `${weddingId}/dress-code.${ext}`))

  const { data: current, error: fetchError } = await client
    .from('casamentos')
    .select('config_tema')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const themeConfig = { ...(current.config_tema as Record<string, unknown>) }
  delete themeConfig.dressCodeImageUrl

  const { error: updateError } = await client
    .from('casamentos')
    .update({ config_tema: themeConfig })
    .eq('id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.dress_code_remove',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return { removed: true }
})
