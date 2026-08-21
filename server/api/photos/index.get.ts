import { serverSupabaseClient } from '#supabase/server'

// Lista curta por natureza (galeria de um único evento) — sem paginação,
// mesmo raciocínio já aplicado a etapas_evento (CLAUDE.md, seção 27 mira
// listas grandes como convidados/convites).
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('fotos')
    .select('*')
    .eq('casamento_id', weddingId)
    .order('ordem_exibicao', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data: data.map((photo) => ({ ...photo, url: resolvePhotoServedUrl(photo) })) }
})
