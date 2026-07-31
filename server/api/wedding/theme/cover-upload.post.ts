import { serverSupabaseClient } from '#supabase/server'

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_SIZE_BYTES = 5 * 1024 * 1024

/**
 * Upload da foto de capa do site (CLAUDE.md, seção 28 — allowlist de MIME,
 * limite de tamanho, nome de arquivo sempre regenerado no servidor, nunca
 * reaproveitado do upload original). Client autenticado (não service_role):
 * a escrita em storage.objects continua protegida por RLS como defesa em
 * profundidade (mesmo modelo do restante do caminho administrativo,
 * CLAUDE.md seção 4.5).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const form = await readMultipartFormData(event)
  const filePart = form?.find((part) => part.name === 'file')

  if (!filePart || !filePart.type) {
    throw badRequestError('Nenhum arquivo enviado.')
  }

  const ext = ALLOWED_MIME_TO_EXT[filePart.type]
  if (!ext) {
    throw badRequestError('Formato de imagem não suportado — use JPEG, PNG ou WebP.')
  }

  if (filePart.data.length > MAX_SIZE_BYTES) {
    throw badRequestError('Arquivo muito grande — o limite é 5MB.')
  }

  const client = await serverSupabaseClient(event)

  // Remove variantes com outra extensão de uploads anteriores — evita
  // orfãos quando o casal troca de formato de imagem entre uma foto e
  // outra (ex.: enviou .jpg antes, agora envia .png).
  const otherExts = Object.values(ALLOWED_MIME_TO_EXT).filter((candidate) => candidate !== ext)
  if (otherExts.length > 0) {
    await client.storage
      .from('wedding-covers')
      .remove(otherExts.map((candidate) => `${weddingId}/cover.${candidate}`))
  }

  const path = `${weddingId}/cover.${ext}`
  const { error: uploadError } = await client.storage
    .from('wedding-covers')
    .upload(path, filePart.data, { contentType: filePart.type, upsert: true })

  if (uploadError) {
    throw badRequestError(uploadError.message)
  }

  const { data: publicUrlData } = client.storage.from('wedding-covers').getPublicUrl(path)
  // Cache-bust: o path não muda entre uploads (upsert), então sem isso o
  // browser serviria a imagem antiga em cache após trocar a foto.
  const publicUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { data: current, error: fetchError } = await client
    .from('weddings')
    .select('theme_config')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const themeConfig = {
    ...(current.theme_config as Record<string, unknown>),
    coverImageUrl: publicUrl,
  }

  const { error: updateError } = await client
    .from('weddings')
    .update({ theme_config: themeConfig })
    .eq('id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.cover_upload',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return { url: publicUrl }
})
