// Fluxo client-side do Google no admin (Fase Galeria via Google Drive —
// CLAUDE.md). Carrega o Google Identity Services + Google Picker sob demanda e
// coordena, num único passo do casal:
//   1) authorization code (code client, ux popup) — trocado no servidor por
//      refresh token pra sincronizar em background;
//   2) access token (token client, silencioso — mesmo escopo já concedido) só
//      pra abrir o Picker;
//   3) escolha da pasta no Picker.
// Só roda no navegador (usa window). Sem sandbox do Google: validar o fluxo
// real com uma conta de verdade antes do merge (mesma postura da InfinitePay).

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const GSI_SRC = 'https://accounts.google.com/gsi/client'
const GAPI_SRC = 'https://apis.google.com/js/api.js'

interface TokenResponse {
  access_token?: string
  error?: string
}
interface CodeResponse {
  code?: string
  error?: string
}
interface GoogleTokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
}
interface GoogleCodeClient {
  requestCode: () => void
}
interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: unknown) => void
  }) => GoogleTokenClient
  initCodeClient: (config: {
    client_id: string
    scope: string
    ux_mode: string
    callback: (response: CodeResponse) => void
    error_callback?: (error: unknown) => void
  }) => GoogleCodeClient
}
interface PickerDocument {
  id: string
  name: string
}
interface PickerResponseData {
  action: string
  docs?: PickerDocument[]
}
interface DocsView {
  setSelectFolderEnabled: (value: boolean) => DocsView
  setIncludeFolders: (value: boolean) => DocsView
  setMimeTypes: (value: string) => DocsView
}
interface PickerBuilder {
  addView: (view: DocsView) => PickerBuilder
  setOAuthToken: (token: string) => PickerBuilder
  setDeveloperKey: (key: string) => PickerBuilder
  setTitle: (title: string) => PickerBuilder
  setCallback: (callback: (data: PickerResponseData) => void) => PickerBuilder
  build: () => { setVisible: (visible: boolean) => void }
}
interface PickerNamespace {
  PickerBuilder: new () => PickerBuilder
  DocsView: new (viewId?: unknown) => DocsView
  ViewId: { FOLDERS: unknown }
}
interface Gapi {
  load: (name: string, callback: () => void) => void
}

function getGoogle(): { accounts?: { oauth2: GoogleOAuth2 }; picker?: PickerNamespace } | undefined {
  return (window as unknown as { google?: { accounts?: { oauth2: GoogleOAuth2 }; picker?: PickerNamespace } })
    .google
}
function getGapi(): Gapi | undefined {
  return (window as unknown as { gapi?: Gapi }).gapi
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`))
    document.head.appendChild(script)
  })
}

async function ensureScripts(): Promise<void> {
  await loadScript(GSI_SRC)
  await loadScript(GAPI_SRC)
  await new Promise<void>((resolve, reject) => {
    const gapi = getGapi()
    if (!gapi) {
      reject(new Error('Google API indisponível.'))
      return
    }
    gapi.load('picker', () => resolve())
  })
}

function requestAuthCode(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2 = getGoogle()?.accounts?.oauth2
    if (!oauth2) {
      reject(new Error('Google Identity indisponível.'))
      return
    }
    const codeClient = oauth2.initCodeClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      ux_mode: 'popup',
      callback: (response) => {
        if (response.code) resolve(response.code)
        else reject(new Error('Autorização cancelada.'))
      },
      error_callback: () => reject(new Error('Autorização cancelada.')),
    })
    codeClient.requestCode()
  })
}

function requestAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2 = getGoogle()?.accounts?.oauth2
    if (!oauth2) {
      reject(new Error('Google Identity indisponível.'))
      return
    }
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token)
        else reject(new Error('Não foi possível obter acesso ao Drive.'))
      },
      error_callback: () => reject(new Error('Não foi possível obter acesso ao Drive.')),
    })
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

function pickFolder(
  accessToken: string,
  developerKey: string,
): Promise<{ id: string; name: string } | null> {
  return new Promise((resolve, reject) => {
    const picker = getGoogle()?.picker
    if (!picker) {
      reject(new Error('Google Picker indisponível.'))
      return
    }
    const view = new picker.DocsView(picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setIncludeFolders(true)
      .setMimeTypes('application/vnd.google-apps.folder')

    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(developerKey)
      .setTitle('Escolha a pasta das fotos')
      .setCallback((data) => {
        if (data.action === 'picked') {
          const doc = data.docs?.[0]
          resolve(doc ? { id: doc.id, name: doc.name } : null)
        } else if (data.action === 'cancel') {
          resolve(null)
        }
      })
      .build()
      .setVisible(true)
  })
}

export function useGoogleDrivePicker() {
  async function connectAndPickFolder(): Promise<{
    code: string
    folderId: string
    folderName: string
  } | null> {
    if (!import.meta.client) {
      throw new Error('Disponível apenas no navegador.')
    }
    const config = useRuntimeConfig().public
    const clientId = config.googleOAuthClientId
    const developerKey = config.googlePickerApiKey
    if (!clientId || !developerKey) {
      throw new Error('Integração com o Google não está configurada.')
    }

    await ensureScripts()
    const code = await requestAuthCode(clientId)
    const accessToken = await requestAccessToken(clientId)
    const folder = await pickFolder(accessToken, developerKey)
    if (!folder) {
      return null
    }
    return { code, folderId: folder.id, folderName: folder.name }
  }

  return { connectAndPickFolder }
}
