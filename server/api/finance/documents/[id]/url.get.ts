import { serverSupabaseClient } from '#supabase/server'

/**
 * Link temporário para abrir um documento enviado.
 *
 * O bucket é privado, então não existe URL pública: cada abertura gera uma URL
 * assinada de vida curta. É o que impede um link colado num grupo de WhatsApp
 * de virar acesso permanente a um contrato.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Documento não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('documentos')
    .select('id, caminho_storage, url_externa')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Documento não encontrado.')
  }

  // Documento de link não precisa de assinatura — a URL já é o documento.
  if (data.url_externa) {
    return { url: data.url_externa, externo: true }
  }

  if (!data.caminho_storage || !caminhoPertenceAoCasamento(data.caminho_storage, weddingId)) {
    throw notFoundError('Arquivo não encontrado.')
  }

  return { url: await gerarUrlAssinada(client, data.caminho_storage), externo: false }
})
