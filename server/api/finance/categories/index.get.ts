import { serverSupabaseClient } from '#supabase/server'

/** Categorias ativas do orçamento, na ordem de exibição. */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('categorias_orcamento')
    .select('*')
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .order('ordem_exibicao', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
