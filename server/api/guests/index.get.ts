import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const querySchema = paginationQuerySchema(25).extend({
  search: z.string().trim().max(200).optional(),
  groupId: z.string().uuid().optional(),
  unassigned: z.coerce.boolean().optional(),
  withoutParty: z.coerce.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const {
    page = 1,
    pageSize = 25,
    search,
    groupId,
    unassigned,
    withoutParty,
  } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('convidados')
    .select('*', { count: 'exact' })
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)

  if (search) {
    query = query.ilike('nome_completo', `%${search}%`)
  }
  if (groupId) {
    query = query.eq('grupo_id', groupId)
  }
  // Convidados ainda sem convite — usado pelo seletor "adicionar convidado"
  // na tela de detalhe do convite (CLAUDE.md, seção 12.1).
  if (unassigned) {
    query = query.is('convite_id', null)
  }
  // Convidados que ainda não são acompanhantes de ninguém — usado pela busca
  // de "convidado já cadastrado" ao adicionar um acompanhante no wizard
  // (CLAUDE.md, seção 12.1), pra não sugerir alguém que já pertence a outro
  // grupo (sincronizar_nucleo_convidado ainda bloqueia o caso de convite
  // divergente, este filtro só evita a sugestão ambígua na UI).
  if (withoutParty) {
    query = query.is('nucleo_id', null)
  }

  const { data, error, count } = await query.order('nome_completo', { ascending: true }).range(from, to)

  if (error) {
    throw badRequestError(error.message)
  }

  return {
    data,
    meta: { page, pageSize, total: count ?? 0 },
  }
})
