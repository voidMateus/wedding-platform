import { serverSupabaseClient } from '#supabase/server'

// Mesmo modelo de confiança do wedding.get.ts: leitura pública, sem token,
// amparada pela policy `event_segments_select_public`.
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('id')
    .limit(1)
    .single()

  if (weddingError) {
    throw notFoundError('Casamento não encontrado.')
  }

  const { data, error } = await client
    .from('event_segments')
    .select('*')
    .eq('wedding_id', wedding.id)
    .order('display_order', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
