import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  groupId: z.string().uuid().optional(),
  unassigned: z.coerce.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { page = 1, pageSize = 25, search, groupId, unassigned } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('guests')
    .select('*', { count: 'exact' })
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)

  if (search) {
    query = query.ilike('full_name', `%${search}%`)
  }
  if (groupId) {
    query = query.eq('group_id', groupId)
  }
  // Convidados ainda sem convite — usado pelo seletor "adicionar convidado"
  // na tela de detalhe do convite (CLAUDE.md, seção 12.1).
  if (unassigned) {
    query = query.is('invite_id', null)
  }

  const { data, error, count } = await query.order('full_name', { ascending: true }).range(from, to)

  if (error) {
    throw badRequestError(error.message)
  }

  return {
    data,
    meta: { page, pageSize, total: count ?? 0 },
  }
})
