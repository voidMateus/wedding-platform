import { serverSupabaseClient } from '#supabase/server'

// Log append-only por convite (criado, token enviado, RSVP alterado a cada
// toque via autosave...) — na prática nunca chega perto disso, mas sem
// limite a query fica tecnicamente ilimitada (achado de auditoria).
const MAX_TIMELINE_EVENTS = 500

/** Linha do Tempo do convite — lê historico_convite em ordem cronológica (CLAUDE.md, seção 12.1). */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('historico_convite')
    .select('*')
    .eq('convite_id', id)
    .eq('casamento_id', weddingId)
    .order('ocorrido_em', { ascending: true })
    .limit(MAX_TIMELINE_EVENTS)

  if (error) throw badRequestError(error.message)

  return { data }
})
