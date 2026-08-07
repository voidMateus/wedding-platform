import { serverSupabaseClient } from '#supabase/server'
import { photoReorderSchema } from '#shared/schemas/photos'

// Reordena a galeria (drag-and-drop no admin): grava display_order = posição na
// lista recebida. Escopo por wedding_id (filtro explícito + RLS de photos). A
// sincronização preserva essa ordem depois pela chave source_file_id (Fase
// Galeria via Google Drive). Rota estática — tem precedência sobre [id].patch.ts.
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const { ids } = await validateBody(event, photoReorderSchema)

  const client = await serverSupabaseClient(event)

  // Uma foto por posição; updates concorrentes (lista curta por natureza).
  const results = await Promise.all(
    ids.map((id, index) =>
      client.from('photos').update({ display_order: index }).eq('id', id).eq('wedding_id', weddingId),
    ),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) {
    throw badRequestError(failed.error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'photo.reorder',
    entityType: 'photo',
    entityId: weddingId,
    metadata: { count: ids.length },
  })

  return { ok: true }
})
