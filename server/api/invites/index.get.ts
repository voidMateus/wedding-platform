import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import type { InviteListItem, InviteResponseStatus } from '~/types/invite'

const querySchema = paginationQuerySchema(25).extend({
  search: z.string().trim().max(200).optional(),
  includeArchived: z.coerce.boolean().default(false),
})

function computeResponseStatus(statuses: string[]): InviteResponseStatus {
  if (statuses.length === 0) return 'pending'
  const responded = statuses.filter((s) => s !== 'pendente').length
  if (responded === 0) return 'pending'
  if (responded === statuses.length) return 'responded'
  return 'partial'
}

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { page = 1, pageSize = 25, search, includeArchived } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('convites')
    .select('*', { count: 'exact' })
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)

  if (!includeArchived) {
    query = query.is('arquivado_em', null)
  }
  if (search) {
    query = query.ilike('nome', `%${search}%`)
  }

  const { data: invites, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw badRequestError(error.message)
  }

  const inviteIds = invites.map((i) => i.id)
  const responsibleIds = invites.map((i) => i.convidado_responsavel_id).filter((id): id is string => Boolean(id))

  const [guestsResult, responsesResult, responsibleResult] = await Promise.all([
    inviteIds.length
      ? client.from('convidados').select('id, convite_id').in('convite_id', inviteIds).is('excluido_em', null)
      : Promise.resolve({ data: [], error: null }),
    inviteIds.length
      ? client.from('respostas_rsvp').select('convite_id, status_rsvp').in('convite_id', inviteIds)
      : Promise.resolve({ data: [], error: null }),
    responsibleIds.length
      ? client.from('convidados').select('id, nome_completo').in('id', responsibleIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (guestsResult.error) throw badRequestError(guestsResult.error.message)
  if (responsesResult.error) throw badRequestError(responsesResult.error.message)
  if (responsibleResult.error) throw badRequestError(responsibleResult.error.message)

  const memberCountByInvite = new Map<string, number>()
  for (const guest of guestsResult.data ?? []) {
    memberCountByInvite.set(guest.convite_id, (memberCountByInvite.get(guest.convite_id) ?? 0) + 1)
  }

  const statusesByInvite = new Map<string, string[]>()
  for (const response of responsesResult.data ?? []) {
    const list = statusesByInvite.get(response.convite_id) ?? []
    list.push(response.status_rsvp)
    statusesByInvite.set(response.convite_id, list)
  }

  const responsibleNameById = new Map<string, string>()
  for (const guest of responsibleResult.data ?? []) {
    responsibleNameById.set(guest.id, guest.nome_completo)
  }

  const data: InviteListItem[] = invites.map((invite) => ({
    ...invite,
    responsibleGuestName: invite.convidado_responsavel_id
      ? (responsibleNameById.get(invite.convidado_responsavel_id) ?? null)
      : null,
    memberCount: memberCountByInvite.get(invite.id) ?? 0,
    responseStatus: computeResponseStatus(statusesByInvite.get(invite.id) ?? []),
  }))

  return {
    data,
    meta: { page, pageSize, total: count ?? 0 },
  }
})
