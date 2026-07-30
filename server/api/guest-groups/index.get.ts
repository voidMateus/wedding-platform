import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { page = 1, pageSize = 25 } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await client
    .from('guest_groups')
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
