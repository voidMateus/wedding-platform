import { serverSupabaseClient } from '#supabase/server'
import { galleryPublicLinkSchema } from '#shared/schemas/gallery'

// Modo link público (Fase Galeria via Google Drive — CLAUDE.md). O casal cola
// a URL de uma pasta compartilhada como "qualquer pessoa com o link". Sem
// OAuth: a listagem usa a API key do projeto (cota compartilhada entre todos
// os casamentos nesse modo — limitação documentada no CLAUDE.md).
const SAFE_COLUMNS =
  'id, provider, mode, folder_id, folder_name, status, last_synced_at, last_sync_error, last_sync_photo_count, created_at, updated_at'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, galleryPublicLinkSchema)

  const folderId = extractDriveFolderId(input.folderUrl)
  if (!folderId) {
    throw badRequestError(
      'Não reconheci uma pasta do Google Drive nesse link. Cole o link de compartilhamento da pasta.',
    )
  }

  const apiKey = useRuntimeConfig().googleDriveApiKey
  if (!apiKey) {
    throw badRequestError('Modo de link público indisponível — a plataforma não está configurada para isso.')
  }

  // Valida o acesso antes de gravar: a pasta precisa estar realmente pública.
  const listing = await listDriveFolderImages({ folderId, apiKey })
  if (!listing.ok) {
    throw badRequestError(
      'Não consegui acessar essa pasta. Confirme que ela está compartilhada como "qualquer pessoa com o link pode ver".',
    )
  }

  const folderName = await fetchDriveFolderName({ folderId, apiKey })

  const client = await serverSupabaseClient(event)
  const { error: upsertError } = await client.from('gallery_source_connections').upsert(
    {
      wedding_id: weddingId,
      provider: 'google_drive',
      mode: 'public_link',
      folder_id: folderId,
      folder_name: folderName,
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_expires_at: null,
      token_scope: null,
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
    action: 'gallery.connect_public_link',
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
