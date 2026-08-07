import { serverSupabaseClient } from '#supabase/server'
import { galleryGoogleConnectSchema } from '#shared/schemas/gallery'

// Modo OAuth (Fase Galeria via Google Drive — CLAUDE.md). O client obtém o
// authorization code (Google Identity Services, prompt=consent para garantir
// refresh token) e a pasta escolhida no Google Picker, e envia os dois aqui.
// O servidor troca o code por refresh/access token, cifra em repouso, grava a
// conexão já com a pasta e dispara o primeiro sync.
const SAFE_COLUMNS =
  'id, provider, mode, folder_id, folder_name, status, last_synced_at, last_sync_error, last_sync_photo_count, created_at, updated_at'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, galleryGoogleConnectSchema)

  const exchange = await exchangeGoogleAuthCode(input.code)
  if (!exchange.ok) {
    throw badRequestError(`Não foi possível conectar ao Google: ${exchange.reason}`)
  }

  const client = await serverSupabaseClient(event)

  // refresh_token só vem na 1ª concessão (ou com prompt=consent). Se não veio,
  // preserva o já armazenado (reconexão da mesma conta); sem nenhum, não há
  // como sincronizar em background.
  let refreshTokenEncrypted = exchange.refreshToken ? encryptToken(exchange.refreshToken) : null
  if (!refreshTokenEncrypted) {
    const { data: current } = await client
      .from('gallery_source_connections')
      .select('refresh_token_encrypted')
      .eq('wedding_id', weddingId)
      .maybeSingle()
    refreshTokenEncrypted = current?.refresh_token_encrypted ?? null
  }
  if (!refreshTokenEncrypted) {
    throw badRequestError(
      'O Google não concedeu acesso contínuo. Refaça a conexão autorizando novamente o acesso à sua conta.',
    )
  }

  const folderName =
    input.folderName ??
    (await fetchDriveFolderName({ folderId: input.folderId, accessToken: exchange.accessToken })) ??
    null

  const { error: upsertError } = await client.from('gallery_source_connections').upsert(
    {
      wedding_id: weddingId,
      provider: 'google_drive',
      mode: 'oauth',
      folder_id: input.folderId,
      folder_name: folderName,
      access_token_encrypted: encryptToken(exchange.accessToken),
      refresh_token_encrypted: refreshTokenEncrypted,
      token_expires_at: new Date(Date.now() + exchange.expiresInSeconds * 1000).toISOString(),
      token_scope: exchange.scope ?? null,
      status: 'active',
      last_sync_error: null,
      created_by: memberId,
    },
    { onConflict: 'wedding_id' },
  )
  if (upsertError) {
    throw badRequestError(upsertError.message)
  }

  const sync = await runGallerySyncForWedding(event, weddingId)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gallery.connect_google',
    entityType: 'gallery_source_connection',
    entityId: weddingId,
  })

  const { data: connection } = await client
    .from('gallery_source_connections')
    .select(SAFE_COLUMNS)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  return { connection: connection ?? null, sync }
})
