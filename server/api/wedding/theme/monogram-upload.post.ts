import { serverSupabaseClient } from '#supabase/server'

/**
 * Upload do monograma do casal — a arte que assina a capa, a navegação e o
 * rodapé (Fase Rebrand do Convite). Mesmo bucket `wedding-covers` das outras
 * duas imagens do tema, com path próprio `monogram.{ext}`, e mesmas regras de
 * segurança de sempre (CLAUDE.md, seção 28): allowlist de MIME, limite de
 * tamanho e nome de arquivo regenerado no servidor, nunca reaproveitado do
 * upload original.
 *
 * SVG fica de fora da allowlist compartilhada de propósito, e vale dizer por
 * quê aqui: é o formato que um designer entregaria para uma marca, mas um SVG
 * é um documento que pode carregar <script>, servido do mesmo domínio do
 * site. PNG/WebP com transparência resolvem o caso real sem abrir isso.
 *
 * Sem ponto de foco: diferente da capa e da foto da história, o monograma é
 * uma marca chapada desenhada para ser vista inteira — não há enquadramento a
 * escolher.
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

  // Remove variantes com outra extensão de uploads anteriores — evita órfãos
  // quando o casal troca de formato entre um envio e outro.
  const otherExts = Object.values(ALLOWED_IMAGE_MIME_TO_EXT).filter(
    (candidate) => candidate !== ext,
  )
  if (otherExts.length > 0) {
    await client.storage
      .from('wedding-covers')
      .remove(otherExts.map((candidate) => `${weddingId}/monogram.${candidate}`))
  }

  const path = `${weddingId}/monogram.${ext}`
  const { error: uploadError } = await client.storage
    .from('wedding-covers')
    .upload(path, filePart.data, { contentType: filePart.type, upsert: true })

  if (uploadError) {
    throw badRequestError(uploadError.message)
  }

  const { data: publicUrlData } = client.storage.from('wedding-covers').getPublicUrl(path)
  // Cache-bust: o path não muda entre uploads (upsert), então sem isso o
  // browser serviria o monograma antigo em cache depois da troca.
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
    monogramImageUrl: publicUrl,
  }

  const { error: updateError } = await client
    .from('casamentos')
    .update({ config_tema: themeConfig })
    .eq('id', weddingId)

  if (updateError) {
    throw badRequestError(updateError.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.monogram_upload',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return { url: publicUrl }
})
