import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import type { InviteListItem, InviteResponseStatus } from '~/types/invite'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  includeArchived: z.coerce.boolean().default(false),
})

function computeResponseStatus(statuses: string[]): InviteResponseStatus {
  if (statuses.length === 0) return 'pending'
  const responded = statuses.filter((s) => s !== 'pending').length
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
    .from('invites')
    .select('*', { count: 'exact' })
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data: invites, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw badRequestError(error.message)
  }

  const inviteIds = invites.map((i) => i.id)
  const responsibleIds = invites.map((i) => i.responsible_guest_id).filter((id): id is string => Boolean(id))

  const [guestsResult, responsesResult, responsibleResult] = await Promise.all([
    inviteIds.length
      ? client.from('guests').select('id, invite_id').in('invite_id', inviteIds).is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
    inviteIds.length
      ? client.from('rsvp_responses').select('invite_id, status').in('invite_id', inviteIds)
      : Promise.resolve({ data: [], error: null }),
    responsibleIds.length
      ? client.from('guests').select('id, full_name').in('id', responsibleIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (guestsResult.error) throw badRequestError(guestsResult.error.message)
  if (responsesResult.error) throw badRequestError(responsesResult.error.message)
  if (responsibleResult.error) throw badRequestError(responsibleResult.error.message)

  const memberCountByInvite = new Map<string, number>()
  for (const guest of guestsResult.data ?? []) {
    memberCountByInvite.set(guest.invite_id, (memberCountByInvite.get(guest.invite_id) ?? 0) + 1)
  }

  const statusesByInvite = new Map<string, string[]>()
  for (const response of responsesResult.data ?? []) {
    const list = statusesByInvite.get(response.invite_id) ?? []
    list.push(response.status)
    statusesByInvite.set(response.invite_id, list)
  }

  const responsibleNameById = new Map<string, string>()
  for (const guest of responsibleResult.data ?? []) {
    responsibleNameById.set(guest.id, guest.full_name)
  }

  const data: InviteListItem[] = invites.map((invite) => ({
    ...invite,
    responsibleGuestName: invite.responsible_guest_id
      ? (responsibleNameById.get(invite.responsible_guest_id) ?? null)
      : null,
    memberCount: memberCountByInvite.get(invite.id) ?? 0,
    responseStatus: computeResponseStatus(statusesByInvite.get(invite.id) ?? []),
  }))

  return {
    data,
    meta: { page, pageSize, total: count ?? 0 },
  }
})
