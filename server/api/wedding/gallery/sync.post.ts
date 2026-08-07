// "Sincronizar agora" (Fase Galeria via Google Drive — CLAUDE.md). Gatilho
// manual do casal; usa o mesmo syncGalleryConnection do cron. Autorizado por
// requireWeddingContext (o cron autoriza por CRON_SECRET), mas a escrita usa
// service_role (mesmo modelo do worker assíncrono, docs/ARCHITECTURE.md 3.4).
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

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
    throw badRequestError('Nenhuma fonte de galeria conectada.')
  }

  const sync = await syncGalleryConnection(admin, connection)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gallery.sync',
    entityType: 'gallery_source_connection',
    entityId: connection.id,
  })

  return { sync }
})
