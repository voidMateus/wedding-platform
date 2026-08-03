import { serverSupabaseClient } from '#supabase/server'

/** Linha do Tempo do convite — lê invite_events em ordem cronológica (CLAUDE.md, seção 12.1). */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('invite_events')
    .select('*')
    .eq('invite_id', id)
    .eq('wedding_id', weddingId)
    .order('occurred_at', { ascending: true })

  if (error) throw badRequestError(error.message)

  return { data }
})
