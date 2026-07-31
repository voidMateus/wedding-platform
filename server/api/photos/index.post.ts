import { serverSupabaseClient } from '#supabase/server'

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_SIZE_BYTES = 5 * 1024 * 1024

/**
 * Upload de uma foto da galeria (CLAUDE.md, seção 28 — allowlist de MIME,
 * limite de tamanho, nome de arquivo sempre regenerado no servidor). Mesmo
 * padrão do upload da foto de capa (server/api/wedding/theme/cover-upload.post.ts),
 * mas cada foto é um arquivo próprio (`{uuid}.{ext}`), não um único path fixo
 * — a galeria tem várias fotos por casamento.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const form = await readMultipartFormData(event)
  const filePart = form?.find((part) => part.name === 'file')
  const captionPart = form?.find((part) => part.name === 'caption')

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

  const path = `${weddingId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await client.storage
    .from('wedding-photos')
    .upload(path, filePart.data, { contentType: filePart.type })

  if (uploadError) {
    throw badRequestError(uploadError.message)
  }

  const { count } = await client
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)

  const caption = captionPart?.data.toString('utf-8').trim()

  const { data, error } = await client
    .from('photos')
    .insert({
      wedding_id: weddingId,
      storage_path: path,
      caption: caption || null,
      display_order: count ?? 0,
      uploaded_by: memberId,
    })
    .select()
    .single()

  if (error) {
    // Evita órfão no Storage se a linha em `photos` não puder ser criada.
    await client.storage.from('wedding-photos').remove([path])
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'photo.upload',
    entityType: 'photo',
    entityId: data.id,
  })

  setResponseStatus(event, 201)
  return { ...data, url: resolvePhotoUrl(client, data.storage_path) }
})
