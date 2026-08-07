import { serverSupabaseClient } from '#supabase/server'

// Desconectar a fonte da galeria (Fase Galeria via Google Drive — CLAUDE.md).
// Revoga o acesso no Google (best-effort) e apaga a conexão; as fotos
// espelhadas saem por cascata (photos.source_connection_id on delete cascade).
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const admin = supabaseAdmin(event)
  const { data: connection } = await admin
    .from('gallery_source_connections')
    .select('id, mode, refresh_token_encrypted')
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (!connection) {
    throw notFoundError('Nenhuma fonte de galeria conectada.')
  }

  if (connection.mode === 'oauth' && connection.refresh_token_encrypted) {
    try {
      await revokeGoogleToken(decryptToken(connection.refresh_token_encrypted))
    } catch {
      // Best-effort: a desconexão local segue mesmo se o Google não responder.
    }
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client
    .from('gallery_source_connections')
    .delete()
    .eq('wedding_id', weddingId)

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gallery.disconnect',
    entityType: 'gallery_source_connection',
    entityId: connection.id,
  })

  return { ok: true }
})
