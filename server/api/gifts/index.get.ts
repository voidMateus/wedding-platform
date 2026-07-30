import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('gifts')
    .select('*')
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
