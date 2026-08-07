import type { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

/**
 * Motor de espelhamento da galeria (Fase Galeria via Google Drive — CLAUDE.md).
 * `photos` reflete o conteúdo atual da pasta da fonte: novos arquivos entram,
 * arquivos removidos na origem saem no próximo sync, e o metadado nosso
 * (legenda/ordem/ponto de foco) é preservado entre syncs.
 *
 * Sempre escreve com o client service_role — mesmo modelo do worker assíncrono
 * (docs/ARCHITECTURE.md, seção 3.4): o gatilho manual autoriza via
 * requireWeddingContext e o cron via CRON_SECRET, mas a escrita em si ignora
 * RLS por design (o service_role é a última linha, CLAUDE.md seção 4.5).
 */

type AdminClient = Awaited<ReturnType<typeof serverSupabaseServiceRole<Database>>>
type GalleryConnection = Database['public']['Tables']['gallery_source_connections']['Row']

export interface GallerySyncResult {
  ok: boolean
  photoCount?: number
  reason?: string
  reauthRequired?: boolean
}

// Renova o access token com folga: um token perto de expirar seria inútil no
// meio da listagem paginada.
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000

export async function syncGalleryConnection(
  admin: AdminClient,
  connection: GalleryConnection,
): Promise<GallerySyncResult> {
  const listing = await resolveListing(admin, connection)
  if (!listing.ok) {
    await admin
      .from('gallery_source_connections')
      .update({
        status: listing.reauthRequired ? 'reauth_required' : 'error',
        last_sync_error: listing.reason,
      })
      .eq('id', connection.id)
    return { ok: false, reason: listing.reason, reauthRequired: listing.reauthRequired }
  }

  const images = listing.images
  const incomingIds = new Set(images.map((image) => image.fileId))

  // Fotos atuais deste casamento — inclui as legadas (source_file_id null),
  // que serão removidas por não estarem na listagem da origem.
  const { data: existing, error: existingError } = await admin
    .from('photos')
    .select('id, source_file_id, caption, display_order, focal_x, focal_y')
    .eq('wedding_id', connection.wedding_id)

  if (existingError) {
    return await markSyncError(admin, connection.id, existingError.message)
  }

  const existingRows = existing ?? []
  const existingByFile = new Map(
    existingRows
      .filter((photo): photo is typeof photo & { source_file_id: string } => Boolean(photo.source_file_id))
      .map((photo) => [photo.source_file_id, photo]),
  )
  const maxOrder = existingRows.reduce((max, photo) => Math.max(max, photo.display_order), -1)
  let nextOrder = maxOrder + 1

  const rows = images.map((image) => {
    const current = existingByFile.get(image.fileId)
    return {
      wedding_id: connection.wedding_id,
      source_connection_id: connection.id,
      source_file_id: image.fileId,
      source_mime_type: image.mimeType,
      source_thumbnail_url: image.thumbnailUrl,
      // Metadado nosso preservado no re-sync; nas fotos novas, os defaults.
      caption: current?.caption ?? null,
      display_order: current ? current.display_order : nextOrder++,
      focal_x: current?.focal_x ?? 50,
      focal_y: current?.focal_y ?? 50,
      storage_path: null,
    }
  })

  if (rows.length > 0) {
    const { error: upsertError } = await admin
      .from('photos')
      .upsert(rows, { onConflict: 'source_connection_id,source_file_id' })
    if (upsertError) {
      return await markSyncError(admin, connection.id, upsertError.message)
    }
  }

  const toDelete = existingRows
    .filter((photo) => !photo.source_file_id || !incomingIds.has(photo.source_file_id))
    .map((photo) => photo.id)
  if (toDelete.length > 0) {
    const { error: deleteError } = await admin.from('photos').delete().in('id', toDelete)
    if (deleteError) {
      return await markSyncError(admin, connection.id, deleteError.message)
    }
  }

  await admin
    .from('gallery_source_connections')
    .update({
      status: 'active',
      last_synced_at: new Date().toISOString(),
      last_sync_error: null,
      last_sync_photo_count: images.length,
    })
    .eq('id', connection.id)

  return { ok: true, photoCount: images.length }
}

type ListResult =
  | { ok: true; images: import('./google-drive').DriveImage[] }
  | { ok: false; reason: string; reauthRequired?: boolean }

async function resolveListing(admin: AdminClient, connection: GalleryConnection): Promise<ListResult> {
  if (connection.mode === 'public_link') {
    const apiKey = useRuntimeConfig().googleDriveApiKey
    if (!apiKey) {
      return { ok: false, reason: 'Listagem pública indisponível: GOOGLE_DRIVE_API_KEY não configurada.' }
    }
    return listDriveFolderImages({ folderId: connection.folder_id, apiKey })
  }

  const access = await ensureAccessToken(admin, connection)
  if (!access.ok) {
    return { ok: false, reason: access.reason, reauthRequired: access.reauthRequired }
  }
  return listDriveFolderImages({ folderId: connection.folder_id, accessToken: access.accessToken })
}

type AccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: string; reauthRequired?: boolean }

async function ensureAccessToken(
  admin: AdminClient,
  connection: GalleryConnection,
): Promise<AccessTokenResult> {
  const now = Date.now()
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0

  if (connection.access_token_encrypted && expiresAt > now + ACCESS_TOKEN_EXPIRY_BUFFER_MS) {
    try {
      return { ok: true, accessToken: decryptToken(connection.access_token_encrypted) }
    } catch {
      // Cifra ilegível (ex.: chave rotacionada) — tenta renovar via refresh.
    }
  }

  if (!connection.refresh_token_encrypted) {
    return { ok: false, reason: 'Conta Google sem refresh token — reconecte.', reauthRequired: true }
  }

  let refreshToken: string
  try {
    refreshToken = decryptToken(connection.refresh_token_encrypted)
  } catch {
    return { ok: false, reason: 'Token armazenado ilegível — reconecte a conta Google.', reauthRequired: true }
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken)
  if (!refreshed.ok) {
    // Refresh falhou = provável revogação do acesso pelo casal no Google.
    return { ok: false, reason: refreshed.reason, reauthRequired: true }
  }

  await admin
    .from('gallery_source_connections')
    .update({
      access_token_encrypted: encryptToken(refreshed.accessToken),
      token_expires_at: new Date(now + refreshed.expiresInSeconds * 1000).toISOString(),
    })
    .eq('id', connection.id)

  return { ok: true, accessToken: refreshed.accessToken }
}

async function markSyncError(
  admin: AdminClient,
  connectionId: string,
  reason: string,
): Promise<GallerySyncResult> {
  await admin
    .from('gallery_source_connections')
    .update({ status: 'error', last_sync_error: reason })
    .eq('id', connectionId)
  return { ok: false, reason }
}
