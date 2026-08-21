import { serverSupabaseClient } from '#supabase/server'

// "Sincronizar agora" (Fase Galeria via Google Drive — CLAUDE.md). Gatilho
// manual do casal; usa o mesmo syncGalleryConnection do cron. Autorizado por
// requireWeddingContext, e a leitura que resolve a conexão do casal usa o
// client da própria requisição (RLS como defesa em profundidade — mesmo
// padrão de wedding-context.ts). Só o motor de sincronização em si
// (syncGalleryConnection, compartilhado com o cron, que não tem sessão de
// usuário) roda com service_role (mesmo modelo do worker assíncrono,
// docs/ARCHITECTURE.md 3.4).
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data: connection, error } = await client
    .from('conexoes_galeria')
    .select('*')
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!connection) {
    throw badRequestError('Nenhuma fonte de galeria conectada.')
  }

  const admin = supabaseAdmin(event)
  const sync = await syncGalleryConnection(admin, connection)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gallery.sync',
    entityType: 'gallery_source_connection',
    entityId: connection.id,
  })

  return { sync }
})
