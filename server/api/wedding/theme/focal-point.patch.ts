import { serverSupabaseClient } from '#supabase/server'
import { themeFocalPointSchema } from '#shared/schemas/theme'

/**
 * Ponto de foco (enquadramento) da foto de capa ou da foto da seção "Nossa
 * História" (CLAUDE.md, seção 22.2/28). Endpoint próprio: o foco só faz
 * sentido escolhido depois de ver a prévia da foto já enviada, então não
 * cabe no mesmo request do upload nem no formulário geral de Aparência.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, themeFocalPointSchema)

  const client = await serverSupabaseClient(event)
  const { data: current, error: fetchError } = await client
    .from('weddings')
    .select('theme_config')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const xKey = input.target === 'cover' ? 'coverFocalX' : 'storyFocalX'
  const yKey = input.target === 'cover' ? 'coverFocalY' : 'storyFocalY'
  const themeConfig = {
    ...(current.theme_config as Record<string, unknown>),
    [xKey]: input.x,
    [yKey]: input.y,
  }

  const { error: updateError } = await client
    .from('weddings')
    .update({ theme_config: themeConfig })
    .eq('id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.theme_focal_point_update',
    entityType: 'wedding',
    entityId: weddingId,
    metadata: { target: input.target },
  })

  return { target: input.target, x: input.x, y: input.y }
})
