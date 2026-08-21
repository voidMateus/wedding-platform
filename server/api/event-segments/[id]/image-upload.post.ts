import { serverSupabaseClient } from '#supabase/server'

/**
 * Upload da foto de local de um item do cronograma (CLAUDE.md, seção 28 —
 * allowlist de MIME, limite de tamanho, nome de arquivo sempre regenerado no
 * servidor). Mesmo padrão da foto de capa (cover-upload.post.ts), mas
 * particionado por event_segment.id em vez de um slot fixo por wedding_id —
 * cada item do cronograma tem sua própria foto opcional.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do item do cronograma não informado.')
  }

  const form = await readMultipartFormData(event)
  const filePart = form?.find((part) => part.name === 'file')

  if (!filePart || !filePart.type) {
    throw badRequestError('Nenhum arquivo enviado.')
  }

  const ext = ALLOWED_IMAGE_MIME_TO_EXT[filePart.type]
  if (!ext) {
    throw badRequestError('Formato de imagem não suportado — use JPEG, PNG ou WebP.')
  }

  if (filePart.data.length > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    throw badRequestError('Arquivo muito grande — o limite é 5MB.')
  }

  const client = await serverSupabaseClient(event)

  const { data: segment, error: fetchError } = await client
    .from('event_segments')
    .select('id')
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }
  if (!segment) {
    throw notFoundError('Item do cronograma não encontrado.')
  }

  // Remove variantes com outra extensão de uploads anteriores — mesmo
  // raciocínio da foto de capa (evita orfãos ao trocar de formato).
  const otherExts = Object.values(ALLOWED_IMAGE_MIME_TO_EXT).filter((candidate) => candidate !== ext)
  if (otherExts.length > 0) {
    await client.storage
      .from('wedding-event-segments')
      .remove(otherExts.map((candidate) => `${weddingId}/${id}.${candidate}`))
  }

  const path = `${weddingId}/${id}.${ext}`
  const { error: uploadError } = await client.storage
    .from('wedding-event-segments')
    .upload(path, filePart.data, { contentType: filePart.type, upsert: true })

  if (uploadError) {
    throw badRequestError(uploadError.message)
  }

  const { data: publicUrlData } = client.storage.from('wedding-event-segments').getPublicUrl(path)
  const publicUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await client
    .from('event_segments')
    .update({ image_url: publicUrl })
    .eq('id', id)
    .eq('wedding_id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'event_segment.image_upload',
    entityType: 'event_segment',
    entityId: id,
  })

  return { url: publicUrl }
})
