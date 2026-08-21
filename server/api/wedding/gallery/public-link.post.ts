import { serverSupabaseClient } from '#supabase/server'
import { galleryPublicLinkSchema } from '#shared/schemas/gallery'

// Modo link público (Fase Galeria via Google Drive — CLAUDE.md). O casal cola
// a URL de uma pasta compartilhada como "qualquer pessoa com o link". Sem
// OAuth: a listagem usa a API key do projeto (cota compartilhada entre todos
// os casamentos nesse modo — limitação documentada no CLAUDE.md).
const SAFE_COLUMNS =
  'id, provedor, modo, id_pasta, nome_pasta, status_conexao, ultima_sincronizacao_em, ultimo_erro_sincronizacao, ultima_contagem_fotos, created_at, updated_at'

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
  const { error: upsertError } = await client.from('conexoes_galeria').upsert(
    {
      casamento_id: weddingId,
      provedor: 'google_drive',
      modo: 'public_link',
      id_pasta: folderId,
      nome_pasta: folderName,
      token_acesso_cifrado: null,
      token_renovacao_cifrado: null,
      token_expira_em: null,
      escopo_token: null,
      status_conexao: 'ativo',
      ultimo_erro_sincronizacao: null,
      criado_por: memberId,
    },
    { onConflict: 'casamento_id' },
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
    .from('conexoes_galeria')
    .select(SAFE_COLUMNS)
    .eq('casamento_id', weddingId)
    .maybeSingle()

  return { connection: connection ?? null, sync }
})
