/**
 * Resolve a URL da imagem servida na galeria (Fase Galeria via Google Drive —
 * CLAUDE.md). A imagem vem SEMPRE direto do Google, nunca do nosso Storage:
 *
 *  - Modo OAuth (pasta privada): usa `source_thumbnail_url` (o thumbnailLink
 *    que a Drive API devolve, um lh3.googleusercontent.com renovado a cada
 *    sync) — o endpoint estável drive.google.com/thumbnail não renderiza pra
 *    visitante anônimo quando o arquivo é privado.
 *  - Modo link público: `source_thumbnail_url` é null e o client cai no
 *    endpoint estável de thumbnail (aceita tamanho via sz=w{width}).
 *
 * Compartilhado entre os endpoints de listagem (admin e público).
 */
const DEFAULT_THUMBNAIL_WIDTH = 1600

export function resolvePhotoServedUrl(
  photo: { source_file_id: string | null; source_thumbnail_url: string | null },
  width: number = DEFAULT_THUMBNAIL_WIDTH,
): string {
  if (photo.source_thumbnail_url) {
    return photo.source_thumbnail_url
  }
  if (photo.source_file_id) {
    return `https://drive.google.com/thumbnail?id=${photo.source_file_id}&sz=w${width}`
  }
  // Linha legada sem fonte externa — não deve ocorrer após o 1º sync
  // (o espelhamento remove as fotos antigas baseadas em Storage).
  return ''
}
