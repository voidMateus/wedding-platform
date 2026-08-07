import { serverSupabaseClient } from '#supabase/server'

// Lista curta por natureza (galeria de um único evento) — sem paginação,
// mesmo raciocínio já aplicado a event_segments (CLAUDE.md, seção 27 mira
// listas grandes como guests/guest_groups).
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('photos')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('display_order', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data: data.map((photo) => ({ ...photo, url: resolvePhotoServedUrl(photo) })) }
})
