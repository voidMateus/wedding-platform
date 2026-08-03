import { serverSupabaseClient } from '#supabase/server'

// Mesmo modelo de confiança de wedding.get.ts/event-segments.get.ts: leitura
// pública, sem token, amparada pela policy `photos_select_public`
// (20260731160002_photos_select_public.sql). Resolvido por slug (CLAUDE.md,
// seção 4.4/33).
export default defineEventHandler(async (event) => {
  const slug = getWeddingSlugParam(event)
  const client = await serverSupabaseClient(event)

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('id')
    .eq('slug', slug)
    .single()

  if (weddingError) {
    throw notFoundError('Casamento não encontrado.')
  }

  const { data, error } = await client
    .from('photos')
    .select('*')
    .eq('wedding_id', wedding.id)
    .order('display_order', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data: data.map((photo) => ({ ...photo, url: resolvePhotoUrl(client, photo.storage_path) })) }
})
