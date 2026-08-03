import { serverSupabaseClient } from '#supabase/server'
import type { InviteDetail, InviteMember, InviteResponseStatus } from '~/types/invite'

function computeResponseStatus(statuses: string[]): InviteResponseStatus {
  if (statuses.length === 0) return 'pending'
  const responded = statuses.filter((s) => s !== 'pending').length
  if (responded === 0) return 'pending'
  if (responded === statuses.length) return 'responded'
  return 'partial'
}

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data: invite, error } = await client
    .from('invites')
    .select('*')
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!invite) {
    throw notFoundError('Convite não encontrado.')
  }

  const [guestsResult, responsesResult, tagLinksResult] = await Promise.all([
    client
      .from('guests')
      .select('id, full_name, nickname, party_order')
      .eq('invite_id', id)
      .is('deleted_at', null)
      .order('party_order', { ascending: true }),
    client.from('rsvp_responses').select('guest_id, status').eq('invite_id', id),
    client.from('invite_tag_links').select('tag_id, invite_tags(id, wedding_id, name, created_at, updated_at)').eq('invite_id', id),
  ])

  if (guestsResult.error) throw badRequestError(guestsResult.error.message)
  if (responsesResult.error) throw badRequestError(responsesResult.error.message)
  if (tagLinksResult.error) throw badRequestError(tagLinksResult.error.message)

  const statusByGuest = new Map(responsesResult.data?.map((r) => [r.guest_id, r.status]) ?? [])

  const members: InviteMember[] = (guestsResult.data ?? []).map((guest) => ({
    id: guest.id,
    fullName: guest.full_name,
    nickname: guest.nickname,
    partyOrder: guest.party_order,
    isResponsible: guest.id === invite.responsible_guest_id,
    rsvpStatus: (statusByGuest.get(guest.id) ?? 'pending') as InviteMember['rsvpStatus'],
  }))

  const tags = (tagLinksResult.data ?? [])
    .map((link) => link.invite_tags)
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))

  const result: InviteDetail = {
    ...invite,
    responseStatus: computeResponseStatus(members.map((m) => m.rsvpStatus)),
    members,
    tags,
  }

  return result
})
