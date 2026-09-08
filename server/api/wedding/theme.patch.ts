import { serverSupabaseClient } from '#supabase/server'
import { themeConfigSchema } from '#shared/schemas/theme'

/**
 * Aparência do site (CLAUDE.md, seção 22.3) — endpoint próprio, separado de
 * PATCH /api/wedding (dados de negócio do evento). Só mexe nas chaves de
 * config_tema de sua responsabilidade (as do themeConfigSchema) — nunca
 * toca coverImageUrl/storyImageUrl, geridos à parte pelos endpoints de
 * upload.
 *
 * As chaves gravadas são derivadas do themeConfigSchema (ver abaixo), e não
 * mais listadas à mão: campo novo do schema passa a ser persistido sozinho.
 * Enquanto a lista era manual, esquecê-la descartava o campo em silêncio —
 * classe de bug que ocorreu duas vezes neste endpoint.
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

  const themeConfig: Record<string, unknown> = {
    ...(current.config_tema as Record<string, unknown>),
  }

  // As chaves gravadas saem do PRÓPRIO schema, não de uma lista escrita à
  // mão. A lista manual que existia aqui é a origem literal da classe de bug
  // avisada no comentário acima: campo novo entra no schema, ninguém lembra
  // de acrescentá-lo na cópia, e ele passa a ser descartado em silêncio — sem
  // erro de validação, sem erro de tipo, sem falha de teste. Derivando do
  // schema, um campo novo passa a ser gravado no mesmo commit em que nasce.
  //
  // Continua sendo um merge sobre o config atual (não uma substituição): as
  // chaves geridas por outros endpoints — coverImageUrl, storyImageUrl,
  // monogramImageUrl, os pontos de foco, galleryPreviewCount — não estão no
  // schema e por isso sobrevivem intactas a um salvamento de Aparência.
  for (const key of Object.keys(themeConfigSchema.shape)) {
    themeConfig[key] = input[key as keyof typeof input]
  }

  // Único campo com tratamento próprio: string vazia significa "tema
  // personalizado, nenhum preset", e gravar '' deixaria um valor falsamente
  // presente onde o resto do código espera ausência.
  themeConfig.presetId = input.presetId || undefined

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
