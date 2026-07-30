import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('gift_categories')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('display_order', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
