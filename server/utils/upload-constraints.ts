// Restrições de upload de imagem (CLAUDE.md, seção 11 — allowlist de MIME
// type, limite de tamanho) compartilhadas pelos 3 endpoints de upload de
// imagem (capa, história, foto de local do cronograma).

export const ALLOWED_IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
