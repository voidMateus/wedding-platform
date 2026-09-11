import { serverSupabaseClient } from '#supabase/server'
import { documentPatchSchema } from '#shared/schemas/finance'

/** Edita só o metadado. Trocar o arquivo é excluir e enviar outro. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Documento não informado.')
  }

  const input = await validateBody(event, documentPatchSchema)

  const atualizacao: Record<string, unknown> = {}
  if (input.titulo !== undefined) atualizacao.titulo = input.titulo
  if (input.tipo !== undefined) atualizacao.tipo = input.tipo
  if (input.fornecedorId !== undefined) atualizacao.fornecedor_id = input.fornecedorId ?? null
  if (input.despesaId !== undefined) atualizacao.despesa_id = input.despesaId ?? null

  if (Object.keys(atualizacao).length === 0) {
    throw badRequestError('Nada para atualizar.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('documentos')
    .update(atualizacao)
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Documento não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.document.update',
    entityType: 'document',
    entityId: data.id,
  })

  return data
})
