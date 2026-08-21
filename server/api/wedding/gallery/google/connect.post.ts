import { serverSupabaseClient } from '#supabase/server'
import { galleryGoogleConnectSchema } from '#shared/schemas/gallery'

// Modo OAuth (Fase Galeria via Google Drive — CLAUDE.md). O client obtém o
// authorization code (Google Identity Services, prompt=consent para garantir
// refresh token) e a pasta escolhida no Google Picker, e envia os dois aqui.
// O servidor troca o code por refresh/access token, cifra em repouso, grava a
// conexão já com a pasta e dispara o primeiro sync.
const SAFE_COLUMNS =
  'id, provedor, modo, id_pasta, nome_pasta, status_conexao, ultima_sincronizacao_em, ultimo_erro_sincronizacao, ultima_contagem_fotos, created_at, updated_at'

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
      .from('conexoes_galeria')
      .select('token_renovacao_cifrado')
      .eq('casamento_id', weddingId)
      .maybeSingle()
    refreshTokenEncrypted = current?.token_renovacao_cifrado ?? null
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

  const { error: upsertError } = await client.from('conexoes_galeria').upsert(
    {
      casamento_id: weddingId,
      provedor: 'google_drive',
      modo: 'oauth',
      id_pasta: input.folderId,
      nome_pasta: folderName,
      token_acesso_cifrado: encryptToken(exchange.accessToken),
      token_renovacao_cifrado: refreshTokenEncrypted,
      token_expira_em: new Date(Date.now() + exchange.expiresInSeconds * 1000).toISOString(),
      escopo_token: exchange.scope ?? null,
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
    action: 'gallery.connect_google',
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
