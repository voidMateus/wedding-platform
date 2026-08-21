import { serverSupabaseClient } from '#supabase/server'

// pageSize default 100 (não 25 como guests/invites) porque grupos é lista
// curta tipo "tag" — todas as telas hoje pedem a lista inteira de uma vez,
// nunca paginam de fato (ver call sites de listGroups()).
const querySchema = paginationQuerySchema(100)

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { page = 1, pageSize = 100 } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await client
    .from('groups')
    .select('*', { count: 'exact' })
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to)

  if (error) {
    throw badRequestError(error.message)
  }

  return {
    data,
    meta: { page, pageSize, total: count ?? 0 },
  }
})
