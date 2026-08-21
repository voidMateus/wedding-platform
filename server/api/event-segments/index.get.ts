import { serverSupabaseClient } from '#supabase/server'

// Lista curta por natureza (cerimônia, recepção, festa...) — sem paginação,
// diferente de convidados/convites (CLAUDE.md, seção 27 mira listas grandes).
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('etapas_evento')
    .select('*')
    .eq('casamento_id', weddingId)
    .order('ordem_exibicao', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
