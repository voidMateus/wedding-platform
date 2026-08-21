import type { H3Event } from 'h3'
import type { GallerySyncResult } from '~/types/gallery'

/**
 * Dispara o sync da galeria de um casamento (gatilho manual/connect). Resolve
 * a conexão com o client service_role e delega para syncGalleryConnection —
 * mesmo caminho de código usado pelo cron (GET /api/cron/sync-galleries).
 */
export async function runGallerySyncForWedding(
  event: H3Event,
  weddingId: string,
): Promise<GallerySyncResult> {
  const admin = supabaseAdmin(event)
  const { data: connection, error } = await admin
    .from('gallery_source_connections')
    .select('*')
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!connection) {
    return { ok: false, reason: 'Nenhuma fonte de galeria conectada.' }
  }

  return syncGalleryConnection(admin, connection)
}
