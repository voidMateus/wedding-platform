import { serverSupabaseClient } from '#supabase/server'

/** Exclusão física: rascunho de layout, sem valor histórico próprio. */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw badRequestError('id do elemento não informado.')

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('elementos_planta')
    .delete()
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id')
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!data) throw notFoundError('Elemento não encontrado.')

  return { id }
})
