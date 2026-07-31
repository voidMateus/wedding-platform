import { serverSupabaseClient } from '#supabase/server'
import { themeConfigSchema } from '#shared/schemas/theme'

/**
 * Aparência do site (CLAUDE.md, seção 22.3) — endpoint próprio, separado de
 * PATCH /api/wedding (dados de negócio do evento). Só mexe nas chaves de
 * theme_config de sua responsabilidade (presetId, primaryColor,
 * secondaryColor, titleColor, bodyColor, fontPairId, showCountdown) — nunca
 * toca coverImageUrl, gerido à parte pelos endpoints de upload.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, themeConfigSchema)

  const client = await serverSupabaseClient(event)

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
    presetId: input.presetId || undefined,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    titleColor: input.titleColor,
    bodyColor: input.bodyColor,
    fontPairId: input.fontPairId,
    showCountdown: input.showCountdown,
  }

  const { data, error } = await client
    .from('weddings')
    .update({ theme_config: themeConfig })
    .eq('id', weddingId)
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.theme_update',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return data
})
