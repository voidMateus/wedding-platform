/**
 * Extrai o folder id de uma URL de compartilhamento do Google Drive (ou aceita
 * um id já "puro"). Isolado sem dependência de auto-import do Nitro de
 * propósito — é o pedaço mais suscetível a bug e o único testável em unidade
 * sem tocar na Drive API (tests/unit/utils/drive-folder-id.spec.ts).
 *
 * Formatos cobertos:
 *   - https://drive.google.com/drive/folders/{id}
 *   - https://drive.google.com/drive/u/0/folders/{id}?usp=sharing
 *   - https://drive.google.com/open?id={id}
 *   - https://drive.google.com/drive/folders/{id}?resourcekey=...
 *   - o próprio {id} colado sozinho
 *
 * Retorna null quando não encontra um id plausível — o handler decide a
 * mensagem de erro. O charset é restrito a [A-Za-z0-9_-], o mesmo que o
 * Google usa, o que também serve de sanitização antes de montar o parâmetro
 * `q` da Drive API (google-drive.ts).
 */
const FOLDER_ID_CHARSET = /^[a-zA-Z0-9_-]+$/

export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  // Id "puro" colado direto (sem barra, sem query).
  if (!trimmed.includes('/') && !trimmed.includes('?') && FOLDER_ID_CHARSET.test(trimmed)) {
    return trimmed
  }

  // .../folders/{id}
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (folderMatch?.[1]) {
    return folderMatch[1]
  }

  // ?id={id} / &id={id} (open?id=, uc?id=)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParamMatch?.[1]) {
    return idParamMatch[1]
  }

  return null
}

export function isValidDriveFolderId(id: string): boolean {
  return FOLDER_ID_CHARSET.test(id)
}
