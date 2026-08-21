import { serverSupabaseClient } from '#supabase/server'

/** Sem soft delete — etiquetas_convite não carrega valor histórico próprio (CLAUDE.md, seção 12.1). */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id da etiqueta não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client.from('etiquetas_convite').delete().eq('id', id).eq('casamento_id', weddingId)

  if (error) throw badRequestError(error.message)

  return { id }
})
