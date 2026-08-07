import { serverSupabaseClient } from '#supabase/server'
import { weddingContentConfigSchema } from '#shared/schemas/content'

/**
 * Personalização das mensagens narrativas do site público (CLAUDE.md,
 * roadmap "Fase Mensagens Personalizáveis") — endpoint próprio, separado de
 * PATCH /api/wedding (dados de negócio) e de PATCH /api/wedding/theme
 * (visual). Diferente de theme.patch.ts, não há nenhum campo de
 * content_config gerido por outro endpoint — o body validado inteiro é
 * gravado direto, sem merge manual de chaves (evita por construção a classe
 * de bug já registrada duas vezes em theme.patch.ts: campo novo do schema
 * esquecido na lista manual e descartado silenciosamente).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, weddingContentConfigSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('weddings')
    .update({ content_config: input })
    .eq('id', weddingId)
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.content_update',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return data
})
