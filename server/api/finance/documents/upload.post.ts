import { serverSupabaseClient } from '#supabase/server'
import { TIPOS_DOCUMENTO, type TipoDocumento } from '#shared/schemas/finance'

/**
 * Envia um arquivo para o bucket PRIVADO `wedding-documents` e registra o
 * documento (CLAUDE.md, seção 11 — allowlist de MIME, limite de tamanho, nome
 * regenerado no servidor).
 *
 * Multipart, então os metadados chegam como campos do form — não dá para
 * validar com o schema de body do Zod. Cada campo é conferido aqui, e o
 * `tipo` contra a mesma lista que o CHECK do banco usa.
 *
 * Client autenticado (não service_role): a escrita em storage.objects segue
 * protegida por RLS como defesa em profundidade, igual aos outros uploads.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)

  const form = await readMultipartFormData(event)
  const arquivo = form?.find((parte) => parte.name === 'file')
  const campo = (nome: string) =>
    form
      ?.find((parte) => parte.name === nome)
      ?.data.toString('utf8')
      .trim() || ''

  if (!arquivo || !arquivo.type) {
    throw badRequestError('Nenhum arquivo enviado.')
  }

  const extensao = ALLOWED_DOCUMENT_MIME_TO_EXT[arquivo.type]
  if (!extensao) {
    throw badRequestError('Formato não suportado — envie PDF, JPEG, PNG ou WebP.')
  }

  if (arquivo.data.length > MAX_DOCUMENT_UPLOAD_SIZE_BYTES) {
    throw badRequestError('Arquivo muito grande — o limite é 10MB.')
  }

  const titulo = campo('titulo') || arquivo.filename || 'Documento'
  const tipoInformado = campo('tipo')
  if (!TIPOS_DOCUMENTO.includes(tipoInformado as TipoDocumento)) {
    throw badRequestError('Tipo de documento inválido.')
  }

  const fornecedorId = campo('fornecedorId') || null
  const despesaId = campo('despesaId') || null

  const client = await serverSupabaseClient(event)
  const caminho = caminhoDeDocumento(weddingId, extensao)

  const { error: uploadError } = await client.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(caminho, arquivo.data, { contentType: arquivo.type, upsert: false })

  if (uploadError) {
    throw badRequestError(uploadError.message)
  }

  const { data, error } = await client
    .from('documentos')
    .insert({
      casamento_id: weddingId,
      titulo: titulo.slice(0, 200),
      tipo: tipoInformado,
      fornecedor_id: fornecedorId,
      despesa_id: despesaId,
      caminho_storage: caminho,
      nome_arquivo: arquivo.filename ?? null,
      tipo_mime: arquivo.type,
      tamanho_bytes: arquivo.data.length,
    })
    .select()
    .single()

  if (error) {
    // Objeto órfão é lixo silencioso que ainda consome storage do casal:
    // se a linha não nasceu, o arquivo não fica.
    await client.storage.from(BUCKET_DOCUMENTOS).remove([caminho])
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.document.create',
    entityType: 'document',
    entityId: data.id,
    metadata: { tipo: data.tipo, origem: 'upload' },
  })

  setResponseStatus(event, 201)
  return data
})
