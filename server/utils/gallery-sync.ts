import type { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { GallerySyncResult } from '~/types/gallery'

/**
 * Motor de espelhamento da galeria (Fase Galeria via Google Drive — CLAUDE.md).
 * `fotos` reflete o conteúdo atual da pasta da fonte: novos arquivos entram,
 * arquivos removidos na origem saem no próximo sync, e o metadado nosso
 * (legenda/ordem/ponto de foco) é preservado entre syncs.
 *
 * Sempre escreve com o client service_role — mesmo modelo do worker assíncrono
 * (docs/ARCHITECTURE.md, seção 3.4): o gatilho manual autoriza via
 * requireWeddingContext e o cron via CRON_SECRET, mas a escrita em si ignora
 * RLS por design (o service_role é a última linha, CLAUDE.md seção 4.5).
 */

type AdminClient = Awaited<ReturnType<typeof serverSupabaseServiceRole<Database>>>
type GalleryConnection = Database['public']['Tables']['conexoes_galeria']['Row']

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
      .from('conexoes_galeria')
      .update({
        status_conexao: listing.reauthRequired ? 'reautenticacao_necessaria' : 'erro',
        ultimo_erro_sincronizacao: listing.reason,
      })
      .eq('id', connection.id)
    return { ok: false, reason: listing.reason, reauthRequired: listing.reauthRequired }
  }

  const images = listing.images
  const incomingIds = new Set(images.map((image) => image.fileId))

  // Fotos atuais deste casamento — inclui as legadas (id_arquivo_origem
  // null), que serão removidas por não estarem na listagem da origem.
  const { data: existing, error: existingError } = await admin
    .from('fotos')
    .select('id, id_arquivo_origem, legenda, ordem_exibicao, foco_x, foco_y')
    .eq('casamento_id', connection.casamento_id)

  if (existingError) {
    return await markSyncError(admin, connection.id, existingError.message)
  }

  const existingRows = existing ?? []
  const existingByFile = new Map(
    existingRows
      .filter((photo): photo is typeof photo & { id_arquivo_origem: string } => Boolean(photo.id_arquivo_origem))
      .map((photo) => [photo.id_arquivo_origem, photo]),
  )
  const maxOrder = existingRows.reduce((max, photo) => Math.max(max, photo.ordem_exibicao), -1)
  let nextOrder = maxOrder + 1

  const rows = images.map((image) => {
    const current = existingByFile.get(image.fileId)
    return {
      casamento_id: connection.casamento_id,
      conexao_id: connection.id,
      id_arquivo_origem: image.fileId,
      tipo_mime_origem: image.mimeType,
      url_miniatura_origem: image.thumbnailUrl,
      // Metadado nosso preservado no re-sync; nas fotos novas, os defaults.
      legenda: current?.legenda ?? null,
      ordem_exibicao: current ? current.ordem_exibicao : nextOrder++,
      foco_x: current?.foco_x ?? 50,
      foco_y: current?.foco_y ?? 50,
      caminho_storage: null,
    }
  })

  if (rows.length > 0) {
    const { error: upsertError } = await admin
      .from('fotos')
      .upsert(rows, { onConflict: 'conexao_id,id_arquivo_origem' })
    if (upsertError) {
      return await markSyncError(admin, connection.id, upsertError.message)
    }
  }

  const toDelete = existingRows
    .filter((photo) => !photo.id_arquivo_origem || !incomingIds.has(photo.id_arquivo_origem))
    .map((photo) => photo.id)
  if (toDelete.length > 0) {
    const { error: deleteError } = await admin.from('fotos').delete().in('id', toDelete)
    if (deleteError) {
      return await markSyncError(admin, connection.id, deleteError.message)
    }
  }

  await admin
    .from('conexoes_galeria')
    .update({
      status_conexao: 'ativo',
      ultima_sincronizacao_em: new Date().toISOString(),
      ultimo_erro_sincronizacao: null,
      ultima_contagem_fotos: images.length,
    })
    .eq('id', connection.id)

  return { ok: true, photoCount: images.length }
}

type ListResult =
  | { ok: true; images: import('./google-drive').DriveImage[] }
  | { ok: false; reason: string; reauthRequired?: boolean }

async function resolveListing(admin: AdminClient, connection: GalleryConnection): Promise<ListResult> {
  if (connection.modo === 'public_link') {
    const apiKey = useRuntimeConfig().googleDriveApiKey
    if (!apiKey) {
      return { ok: false, reason: 'Listagem pública indisponível: GOOGLE_DRIVE_API_KEY não configurada.' }
    }
    return listDriveFolderImages({ folderId: connection.id_pasta, apiKey })
  }

  const access = await ensureAccessToken(admin, connection)
  if (!access.ok) {
    return { ok: false, reason: access.reason, reauthRequired: access.reauthRequired }
  }
  return listDriveFolderImages({ folderId: connection.id_pasta, accessToken: access.accessToken })
}

type AccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: string; reauthRequired?: boolean }

async function ensureAccessToken(
  admin: AdminClient,
  connection: GalleryConnection,
): Promise<AccessTokenResult> {
  const now = Date.now()
  const expiresAt = connection.token_expira_em ? new Date(connection.token_expira_em).getTime() : 0

  if (connection.token_acesso_cifrado && expiresAt > now + ACCESS_TOKEN_EXPIRY_BUFFER_MS) {
    try {
      return { ok: true, accessToken: decryptToken(connection.token_acesso_cifrado) }
    } catch {
      // Cifra ilegível (ex.: chave rotacionada) — tenta renovar via refresh.
    }
  }

  if (!connection.token_renovacao_cifrado) {
    return { ok: false, reason: 'Conta Google sem refresh token — reconecte.', reauthRequired: true }
  }

  let refreshToken: string
  try {
    refreshToken = decryptToken(connection.token_renovacao_cifrado)
  } catch {
    return { ok: false, reason: 'Token armazenado ilegível — reconecte a conta Google.', reauthRequired: true }
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken)
  if (!refreshed.ok) {
    // Refresh falhou = provável revogação do acesso pelo casal no Google.
    return { ok: false, reason: refreshed.reason, reauthRequired: true }
  }

  await admin
    .from('conexoes_galeria')
    .update({
      token_acesso_cifrado: encryptToken(refreshed.accessToken),
      token_expira_em: new Date(now + refreshed.expiresInSeconds * 1000).toISOString(),
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
    .from('conexoes_galeria')
    .update({ status_conexao: 'erro', ultimo_erro_sincronizacao: reason })
    .eq('id', connectionId)
  return { ok: false, reason }
}
