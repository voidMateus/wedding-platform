import { serverSupabaseClient } from '#supabase/server'

/**
 * Upload da imagem da seção "Dress Code" — a referência visual de traje que o
 * casal escolher (uma foto de inspiração, uma paleta, um moodboard).
 *
 * Substituiu uma ilustração desenhada pela plataforma: era a única arte do
 * site que não vinha do casal, e num site que é tipografia e filete ela
 * destoava. Sem imagem enviada a seção fica só com o texto e os cartões, que é
 * também o que o protótipo do convite faz — a imagem é um extra, não um buraco
 * a preencher.
 *
 * Mesmo bucket `wedding-covers` das outras imagens do tema, path próprio
 * `dress-code.{ext}`, e as mesmas regras de sempre (CLAUDE.md, seção 28):
 * allowlist de MIME, limite de tamanho, nome regenerado no servidor.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

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

  // Remove variantes com outra extensão de envios anteriores — evita órfãos
  // quando o casal troca de formato entre uma imagem e outra.
  const otherExts = Object.values(ALLOWED_IMAGE_MIME_TO_EXT).filter(
    (candidate) => candidate !== ext,
  )
  if (otherExts.length > 0) {
    await client.storage
      .from('wedding-covers')
      .remove(otherExts.map((candidate) => `${weddingId}/dress-code.${candidate}`))
  }

  const path = `${weddingId}/dress-code.${ext}`
  const { error: uploadError } = await client.storage
    .from('wedding-covers')
    .upload(path, filePart.data, { contentType: filePart.type, upsert: true })

  if (uploadError) {
    throw badRequestError(uploadError.message)
  }

  const { data: publicUrlData } = client.storage.from('wedding-covers').getPublicUrl(path)
  // Cache-bust: o path não muda entre envios (upsert), então sem isso o browser
  // serviria a imagem antiga depois da troca.
  const publicUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { data: current, error: fetchError } = await client
    .from('casamentos')
    .select('config_tema')
    .eq('id', weddingId)
    .single()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }

  const themeConfig = {
    ...(current.config_tema as Record<string, unknown>),
    dressCodeImageUrl: publicUrl,
  }

  const { error: updateError } = await client
    .from('casamentos')
    .update({ config_tema: themeConfig })
    .eq('id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.dress_code_upload',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return { url: publicUrl }
})
