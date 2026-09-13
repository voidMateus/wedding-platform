import { serverSupabaseClient } from '#supabase/server'

/**
 * Exclusão física — e o arquivo no Storage vai junto.
 *
 * `documentos` não tem soft delete de propósito: um registro escondido com o
 * arquivo vivo no bucket é pior que exclusão franca, porque o casal acredita
 * ter apagado o contrato e ele continua lá.
 *
 * O arquivo é removido DEPOIS da linha: sobrar objeto sem registro é lixo
 * recuperável; sobrar registro apontando para objeto inexistente é um
 * documento que a tela promete e não abre.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Documento não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('documentos')
    .delete()
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id, caminho_storage')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Documento não encontrado.')
  }

  if (data.caminho_storage && caminhoPertenceAoCasamento(data.caminho_storage, weddingId)) {
    await removerArquivo(client, data.caminho_storage)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.document.delete',
    entityType: 'document',
    entityId: id,
  })

  return { id }
})
