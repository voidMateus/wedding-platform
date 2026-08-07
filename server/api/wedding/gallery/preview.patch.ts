import { serverSupabaseClient } from '#supabase/server'
import { galleryPreviewSchema } from '#shared/schemas/gallery'

// Quantidade de fotos na prévia da Galeria na home (Fase Galeria via Google
// Drive). Vive em theme_config (atributo de exibição, como showCountdown), mas
// com endpoint próprio: fica FORA da lista de chaves de theme.patch.ts, que a
// preserva pelo spread — assim o formulário de Aparência nunca a apaga (mesmo
// padrão de coverImageUrl/focal-point, CLAUDE.md seção 22.3).
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const { count } = await validateBody(event, galleryPreviewSchema)

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
    galleryPreviewCount: count,
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
    action: 'gallery.preview_update',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return data
})
