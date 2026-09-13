import { serverSupabaseClient } from '#supabase/server'
import { documentLinkSchema } from '#shared/schemas/finance'

/**
 * Registra um documento que é um LINK externo (Drive, Dropbox...).
 *
 * O caminho do arquivo enviado é outro endpoint (`upload.post.ts`), e por um
 * motivo de segurança: `caminho_storage` nunca pode vir do client, senão um
 * body forjado apontaria uma linha deste casamento para o objeto de outro.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, documentLinkSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('documentos')
    .insert({
      casamento_id: weddingId,
      titulo: input.titulo,
      tipo: input.tipo,
      fornecedor_id: input.fornecedorId ?? null,
      despesa_id: input.despesaId ?? null,
      url_externa: input.urlExterna,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.document.create',
    entityType: 'document',
    entityId: data.id,
    metadata: { tipo: data.tipo, origem: 'link' },
  })

  setResponseStatus(event, 201)
  return data
})
