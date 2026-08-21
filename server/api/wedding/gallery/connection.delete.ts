import { serverSupabaseClient } from '#supabase/server'

// Desconectar a fonte da galeria (Fase Galeria via Google Drive — CLAUDE.md).
// Revoga o acesso no Google (best-effort) e apaga a conexão; as fotos
// espelhadas saem por cascata (fotos.conexao_id on delete cascade).
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const admin = supabaseAdmin(event)
  const { data: connection } = await admin
    .from('conexoes_galeria')
    .select('id, modo, token_renovacao_cifrado')
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (!connection) {
    throw notFoundError('Nenhuma fonte de galeria conectada.')
  }

  if (connection.modo === 'oauth' && connection.token_renovacao_cifrado) {
    try {
      await revokeGoogleToken(decryptToken(connection.token_renovacao_cifrado))
    } catch {
      // Best-effort: a desconexão local segue mesmo se o Google não responder.
    }
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client
    .from('conexoes_galeria')
    .delete()
    .eq('casamento_id', weddingId)

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
