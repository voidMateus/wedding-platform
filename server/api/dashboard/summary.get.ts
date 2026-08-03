import { serverSupabaseClient } from '#supabase/server'
import { computeIsChild } from '#shared/utils/guest-age'

type ResponseStatus = 'pending' | 'confirmed' | 'declined' | 'waitlisted' | 'removed'

function computeInviteStatus(statuses: ResponseStatus[]): 'pending' | 'partial' | 'responded' {
  if (statuses.length === 0) return 'pending'
  const responded = statuses.filter((s) => s !== 'pending').length
  if (responded === 0) return 'pending'
  if (responded === statuses.length) return 'responded'
  return 'partial'
}

/**
 * Indicadores do dashboard administrativo, em três blocos independentes —
 * Convites, Pessoas e RSVP (CLAUDE.md, seção 19.2) — pedido explícito do
 * usuário: são métricas diferentes, não devem ser misturadas num só grid.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [weddingResult, invitesResult, guestsResult, responsesResult, firstAccessResult] = await Promise.all([
    client.from('weddings').select('rsvp_deadline, child_max_age').eq('id', weddingId).single(),
    client
      .from('invites')
      .select('id, status, sent_at, archived_at')
      .eq('wedding_id', weddingId)
      .is('deleted_at', null),
    client
      .from('guests')
      .select('id, invite_id, birth_date, wedding_role')
      .eq('wedding_id', weddingId)
      .is('deleted_at', null),
    client.from('rsvp_responses').select('guest_id, invite_id, status, responded_at').eq('wedding_id', weddingId),
    client
      .from('invite_events')
      .select('invite_id')
      .eq('wedding_id', weddingId)
      .eq('event_type', 'rsvp.first_access'),
  ])

  if (weddingResult.error) throw badRequestError(weddingResult.error.message)
  if (invitesResult.error) throw badRequestError(invitesResult.error.message)
  if (guestsResult.error) throw badRequestError(guestsResult.error.message)
  if (responsesResult.error) throw badRequestError(responsesResult.error.message)
  if (firstAccessResult.error) throw badRequestError(firstAccessResult.error.message)

  const wedding = weddingResult.data
  const invites = invitesResult.data ?? []
  const guests = guestsResult.data ?? []
  const responses = responsesResult.data ?? []

  const statusesByInvite = new Map<string, ResponseStatus[]>()
  const statusByGuest = new Map<string, ResponseStatus>()
  for (const response of responses) {
    statusByGuest.set(response.guest_id, response.status as ResponseStatus)
    const list = statusesByInvite.get(response.invite_id) ?? []
    list.push(response.status as ResponseStatus)
    statusesByInvite.set(response.invite_id, list)
  }

  // --- Convites ---
  let invitesResponded = 0
  let invitesPartial = 0
  let invitesPending = 0
  let invitesArchived = 0
  for (const invite of invites) {
    if (invite.archived_at) invitesArchived += 1
    const inviteStatus = computeInviteStatus(statusesByInvite.get(invite.id) ?? [])
    if (inviteStatus === 'responded') invitesResponded += 1
    else if (inviteStatus === 'partial') invitesPartial += 1
    else invitesPending += 1
  }

  // --- Pessoas ---
  let confirmed = 0
  let declined = 0
  let waitlisted = 0
  let pending = 0
  let children = 0
  let padrinhos = 0
  let madrinhas = 0
  for (const guest of guests) {
    const status = statusByGuest.get(guest.id) ?? 'pending'
    if (status === 'confirmed') confirmed += 1
    else if (status === 'declined') declined += 1
    else if (status === 'waitlisted') waitlisted += 1
    else pending += 1

    if (computeIsChild(guest.birth_date, wedding.child_max_age)) children += 1
    if (guest.wedding_role === 'padrinho') padrinhos += 1
    if (guest.wedding_role === 'madrinha') madrinhas += 1
  }

  // --- RSVP (comportamento ao longo do tempo) ---
  const respondedRows = responses.filter((r) => r.status !== 'pending' && r.responded_at)
  const respondedTimestamps = respondedRows.map((r) => new Date(r.responded_at as string).getTime())
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000

  const sentAtByInvite = new Map(
    invites.filter((i) => i.sent_at).map((i) => [i.id, new Date(i.sent_at as string).getTime()]),
  )
  const responseDurationsHours = respondedRows
    .map((r) => {
      const sentAt = sentAtByInvite.get(r.invite_id)
      if (!sentAt || !r.responded_at) return null
      return (new Date(r.responded_at).getTime() - sentAt) / (1000 * 60 * 60)
    })
    .filter((v): v is number => v !== null && v >= 0)

  const firstAccessInviteIds = new Set((firstAccessResult.data ?? []).map((e) => e.invite_id))
  const viewedNotResponded = invites.filter(
    (invite) =>
      firstAccessInviteIds.has(invite.id) &&
      computeInviteStatus(statusesByInvite.get(invite.id) ?? []) === 'pending',
  ).length

  return {
    rsvpDeadline: wedding.rsvp_deadline,
    invites: {
      total: invites.length,
      sent: invites.filter((i) => i.status === 'sent').length,
      responded: invitesResponded,
      partial: invitesPartial,
      pending: invitesPending,
      archived: invitesArchived,
    },
    people: {
      total: guests.length,
      confirmed,
      declined,
      pending,
      waitlisted,
      children,
      adults: guests.length - children,
      padrinhos,
      madrinhas,
    },
    rsvp: {
      firstResponseAt: respondedTimestamps.length ? new Date(Math.min(...respondedTimestamps)).toISOString() : null,
      lastResponseAt: respondedTimestamps.length ? new Date(Math.max(...respondedTimestamps)).toISOString() : null,
      respondedToday: respondedTimestamps.filter((t) => now - t < oneDayMs).length,
      respondedThisWeek: respondedTimestamps.filter((t) => now - t < 7 * oneDayMs).length,
      responseRatePercent: guests.length ? Math.round((respondedRows.length / guests.length) * 100) : 0,
      avgHoursToRespond: responseDurationsHours.length
        ? Math.round(responseDurationsHours.reduce((a, b) => a + b, 0) / responseDurationsHours.length)
        : null,
      viewedNotResponded,
    },
  }
})
