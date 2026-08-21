import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('casamentos').select('*').eq('id', weddingId).single()

  if (error) {
    throw badRequestError(error.message)
  }

  return data
})
