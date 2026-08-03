import { serverSupabaseClient } from '#supabase/server'

/** Sem soft delete — invite_tags não carrega valor histórico próprio (CLAUDE.md, seção 12.1). */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id da etiqueta não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client.from('invite_tags').delete().eq('id', id).eq('wedding_id', weddingId)

  if (error) throw badRequestError(error.message)

  return { id }
})
