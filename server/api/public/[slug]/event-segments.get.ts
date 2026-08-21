import { serverSupabaseClient } from '#supabase/server'

// Mesmo modelo de confiança do wedding.get.ts: leitura pública, sem token,
// amparada pela policy `etapas_evento_select_publico`. Resolvido por slug
// (CLAUDE.md, seção 4.4/33).
export default defineEventHandler(async (event) => {
  const slug = getWeddingSlugParam(event)
  const client = await serverSupabaseClient(event)

  const { data: wedding, error: weddingError } = await client
    .from('casamentos')
    .select('id')
    .eq('slug', slug)
    .single()

  if (weddingError) {
    throw notFoundError('Casamento não encontrado.')
  }

  const { data, error } = await client
    .from('etapas_evento')
    .select('*')
    .eq('casamento_id', wedding.id)
    .order('ordem_exibicao', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
