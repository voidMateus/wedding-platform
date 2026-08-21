import { serverSupabaseClient } from '#supabase/server'
import { themeConfigSchema } from '#shared/schemas/theme'

/**
 * Aparência do site (CLAUDE.md, seção 22.3) — endpoint próprio, separado de
 * PATCH /api/wedding (dados de negócio do evento). Só mexe nas chaves de
 * config_tema de sua responsabilidade (as do themeConfigSchema) — nunca
 * toca coverImageUrl/storyImageUrl, geridos à parte pelos endpoints de
 * upload. ATENÇÃO: todo campo novo do schema precisa ser adicionado à lista
 * explícita abaixo, senão é silenciosamente descartado (classe de bug já
 * ocorrida duas vezes neste endpoint).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, themeConfigSchema)

  const client = await serverSupabaseClient(event)

  const { data: current, error: fetchError } = await client
    .from('casamentos')
    .select('config_tema')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const themeConfig = {
    ...(current.config_tema as Record<string, unknown>),
    presetId: input.presetId || undefined,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    titleColor: input.titleColor,
    bodyColor: input.bodyColor,
    fontPairId: input.fontPairId,
    showCountdown: input.showCountdown,
    heroButtons: input.heroButtons,
    heroFeaturedButton: input.heroFeaturedButton,
  }

  const { data, error } = await client
    .from('casamentos')
    .update({ config_tema: themeConfig })
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
