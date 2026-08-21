import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('etiquetas_convite')
    .select('*')
    .eq('casamento_id', weddingId)
    .order('nome', { ascending: true })

  if (error) throw badRequestError(error.message)

  return { data }
})
