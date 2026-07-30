import { serverSupabaseClient } from '#supabase/server'

// Lista curta por natureza (cerimônia, recepção, festa...) — sem paginação,
// diferente de guests/guest_groups (CLAUDE.md, seção 27 mira listas grandes).
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('event_segments')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('display_order', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
