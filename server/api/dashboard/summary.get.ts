import { serverSupabaseClient } from '#supabase/server'
import { computeIsChild } from '#shared/utils/guest-age'

type ResponseStatus = 'pendente' | 'confirmado' | 'recusado' | 'lista_espera' | 'removido'

function computeInviteStatus(statuses: ResponseStatus[]): 'pending' | 'partial' | 'responded' {
  if (statuses.length === 0) return 'pending'
  const responded = statuses.filter((s) => s !== 'pendente').length
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
    client.from('casamentos').select('prazo_rsvp, idade_maxima_crianca').eq('id', weddingId).single(),
    client
      .from('convites')
      .select('id, status_convite, enviado_em, arquivado_em')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null),
    client
      .from('convidados')
      .select('id, convite_id, data_nascimento, papel_casamento')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null),
    client.from('respostas_rsvp').select('convidado_id, convite_id, status_rsvp, respondido_em').eq('casamento_id', weddingId),
    client
      .from('historico_convite')
      .select('convite_id')
      .eq('casamento_id', weddingId)
      .eq('tipo_evento', 'rsvp.first_access'),
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
    statusByGuest.set(response.convidado_id, response.status_rsvp as ResponseStatus)
    const list = statusesByInvite.get(response.convite_id) ?? []
    list.push(response.status_rsvp as ResponseStatus)
    statusesByInvite.set(response.convite_id, list)
  }

  // --- Convites ---
  let invitesResponded = 0
  let invitesPartial = 0
  let invitesPending = 0
  let invitesArchived = 0
  for (const invite of invites) {
    if (invite.arquivado_em) invitesArchived += 1
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
    const status = statusByGuest.get(guest.id) ?? 'pendente'
    if (status === 'confirmado') confirmed += 1
    else if (status === 'recusado') declined += 1
    else if (status === 'lista_espera') waitlisted += 1
    else pending += 1

    if (computeIsChild(guest.data_nascimento, wedding.idade_maxima_crianca)) children += 1
    if (guest.papel_casamento === 'padrinho') padrinhos += 1
    if (guest.papel_casamento === 'madrinha') madrinhas += 1
  }

  // --- RSVP (comportamento ao longo do tempo) ---
  const respondedRows = responses.filter((r) => r.status_rsvp !== 'pendente' && r.respondido_em)
  const respondedTimestamps = respondedRows.map((r) => new Date(r.respondido_em as string).getTime())
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000

  const sentAtByInvite = new Map(
    invites.filter((i) => i.enviado_em).map((i) => [i.id, new Date(i.enviado_em as string).getTime()]),
  )
  const responseDurationsHours = respondedRows
    .map((r) => {
      const sentAt = sentAtByInvite.get(r.convite_id)
      if (!sentAt || !r.respondido_em) return null
      return (new Date(r.respondido_em).getTime() - sentAt) / (1000 * 60 * 60)
    })
    .filter((v): v is number => v !== null && v >= 0)

  const firstAccessInviteIds = new Set((firstAccessResult.data ?? []).map((e) => e.convite_id))
  const viewedNotResponded = invites.filter(
    (invite) =>
      firstAccessInviteIds.has(invite.id) &&
      computeInviteStatus(statusesByInvite.get(invite.id) ?? []) === 'pending',
  ).length

  return {
    rsvpDeadline: wedding.prazo_rsvp,
    invites: {
      total: invites.length,
      sent: invites.filter((i) => i.status_convite === 'enviado').length,
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
