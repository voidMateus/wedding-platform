/**
 * Cliente mínimo do Google Drive (Fase Galeria via Google Drive — CLAUDE.md).
 * Sem SDK oficial, chamado via $fetch. Toda função devolve um shape
 * { ok, ... } em vez de lançar em falha de rede/resposta inesperada — mesmo
 * padrão de server/utils/infinitepay.ts, para que uma instabilidade do Google
 * não vire exceção não tratada no meio de um sync ou de uma conexão.
 *
 * Dois modos de acesso (CLAUDE.md):
 *  - OAuth: token do casal (drive.readonly), lista pastas privadas.
 *  - Link público: só a API key do projeto (`key=`), lista uma pasta
 *    compartilhada como "qualquer pessoa com o link". Limitação documentada:
 *    a cota da API key é compartilhada entre todos os casamentos nesse modo,
 *    e "anyone with the link" vs "público" tem nuances que só se confirmam
 *    contra a API real (sem sandbox — mesma postura da InfinitePay, §18.5).
 */

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const OAUTH_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const REQUEST_TIMEOUT_MS = 10000
// redirect_uri do fluxo de código do Google Identity Services (popup) — o
// código é trocado server-side com este valor literal, não uma URL nossa.
const GIS_POSTMESSAGE_REDIRECT = 'postmessage'

export interface DriveImage {
  fileId: string
  name: string
  mimeType: string
  thumbnailUrl: string | null
}

type TokenResult =
  | { ok: true; accessToken: string; refreshToken?: string; expiresInSeconds: number; scope?: string }
  | { ok: false; reason: string }

/** Troca o authorization code (GIS code client) por access + refresh token. */
export async function exchangeGoogleAuthCode(code: string): Promise<TokenResult> {
  const config = useRuntimeConfig()
  try {
    const res = await $fetch<{
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    }>(OAUTH_TOKEN_URL, {
      method: 'POST',
      timeout: REQUEST_TIMEOUT_MS,
      body: new URLSearchParams({
        code,
        client_id: config.public.googleOAuthClientId ?? '',
        client_secret: config.googleOAuthClientSecret ?? '',
        redirect_uri: GIS_POSTMESSAGE_REDIRECT,
        grant_type: 'authorization_code',
      }),
    })
    if (!res?.access_token) {
      return { ok: false, reason: 'O Google não retornou um access token.' }
    }
    return {
      ok: true,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresInSeconds: res.expires_in ?? 3600,
      scope: res.scope,
    }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Falha ao autorizar com o Google.' }
  }
}

/** Renova o access token a partir do refresh token (sync em background). */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<TokenResult> {
  const config = useRuntimeConfig()
  try {
    const res = await $fetch<{ access_token?: string; expires_in?: number; scope?: string }>(
      OAUTH_TOKEN_URL,
      {
        method: 'POST',
        timeout: REQUEST_TIMEOUT_MS,
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: config.public.googleOAuthClientId ?? '',
          client_secret: config.googleOAuthClientSecret ?? '',
          grant_type: 'refresh_token',
        }),
      },
    )
    if (!res?.access_token) {
      return { ok: false, reason: 'O Google não retornou um access token na renovação.' }
    }
    return { ok: true, accessToken: res.access_token, expiresInSeconds: res.expires_in ?? 3600, scope: res.scope }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Falha ao renovar o acesso ao Google.' }
  }
}

/** Revoga um token no Google (best-effort, usado ao desconectar). */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await $fetch(OAUTH_REVOKE_URL, {
      method: 'POST',
      timeout: REQUEST_TIMEOUT_MS,
      body: new URLSearchParams({ token }),
    })
  } catch {
    // Best-effort: se o Google estiver indisponível ou o token já inválido,
    // a desconexão local segue mesmo assim.
  }
}

interface ListInput {
  folderId: string
  apiKey?: string
  accessToken?: string
}

type ListResult =
  | { ok: true; images: DriveImage[] }
  | { ok: false; reason: string; reauthRequired?: boolean }

/**
 * Lista as imagens (mimeType image/*) de uma pasta do Drive, paginando até o
 * fim. `accessToken` (OAuth) e `apiKey` (link público) são mutuamente
 * exclusivos na prática — o chamador passa um dos dois conforme o modo.
 */
export async function listDriveFolderImages(input: ListInput): Promise<ListResult> {
  if (!isValidDriveFolderId(input.folderId)) {
    return { ok: false, reason: 'Id de pasta inválido.' }
  }

  const images: DriveImage[] = []
  let pageToken: string | undefined

  try {
    do {
      const query: Record<string, string> = {
        q: `'${input.folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink)',
        pageSize: '1000',
        orderBy: 'name_natural',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      }
      if (pageToken) query.pageToken = pageToken
      if (input.apiKey) query.key = input.apiKey

      const res = await $fetch<{
        nextPageToken?: string
        files?: Array<{ id: string; name: string; mimeType: string; thumbnailLink?: string }>
      }>(DRIVE_FILES_URL, {
        method: 'GET',
        timeout: REQUEST_TIMEOUT_MS,
        query,
        headers: input.accessToken ? { Authorization: `Bearer ${input.accessToken}` } : undefined,
      })

      for (const file of res.files ?? []) {
        images.push({
          fileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailUrl: file.thumbnailLink ?? null,
        })
      }
      pageToken = res.nextPageToken
    } while (pageToken)

    return { ok: true, images }
  } catch (err) {
    const status = (err as { statusCode?: number; status?: number }).statusCode ?? (err as { status?: number }).status
    // 401/403 no modo OAuth = token revogado/expirado sem refresh possível →
    // o casal precisa reconectar (não é falha transitória de sync).
    const reauthRequired = Boolean(input.accessToken) && (status === 401 || status === 403)
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Falha ao listar a pasta do Google Drive.',
      reauthRequired,
    }
  }
}

/** Busca o nome de uma pasta (best-effort — só para exibir no admin). */
export async function fetchDriveFolderName(input: {
  folderId: string
  apiKey?: string
  accessToken?: string
}): Promise<string | null> {
  if (!isValidDriveFolderId(input.folderId)) {
    return null
  }
  try {
    const query: Record<string, string> = { fields: 'name', supportsAllDrives: 'true' }
    if (input.apiKey) query.key = input.apiKey
    const res = await $fetch<{ name?: string }>(`${DRIVE_FILES_URL}/${input.folderId}`, {
      method: 'GET',
      timeout: REQUEST_TIMEOUT_MS,
      query,
      headers: input.accessToken ? { Authorization: `Bearer ${input.accessToken}` } : undefined,
    })
    return res?.name ?? null
  } catch {
    return null
  }
}
