import { serverSupabaseClient } from '#supabase/server'
import { themeConfigSchema } from '#shared/schemas/theme'

/**
 * Aparência do site (CLAUDE.md, seção 22.3) — endpoint próprio, separado de
 * PATCH /api/wedding (dados de negócio do evento). Mescla todo o `input`
 * validado por `themeConfigSchema` por cima do `theme_config` já salvo —
 * nunca lista os campos um a um aqui: um campo novo no schema (ex.:
 * `countdownStyle`, `heroQuote`/`heroQuoteAttribution`) já é persistido
 * automaticamente, sem precisar lembrar de atualizar este handler também
 * (achado real: `countdownStyle` e `heroQuote`/`heroQuoteAttribution`
 * ficaram órfãos por um tempo justamente por causa da lista manual antiga —
 * CLAUDE.md, Fase Premium Experience). `coverImageUrl`/`storyImageUrl` (e
 * campos de foco) nunca fazem parte de `input` — ficam de fora do schema de
 * propósito, geridos à parte pelos endpoints de upload — então o spread de
 * `current.theme_config` primeiro é o que os preserva aqui.
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
    ...input,
    // Único campo com normalização própria fora do que o schema já resolve
    // (string vazia → "nenhum preset selecionado", não um id real).
    presetId: input.presetId || undefined,
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
