import { serverSupabaseClient } from '#supabase/server'

/**
 * Contadores essenciais do dashboard administrativo (CLAUDE.md, seção 19.2).
 * Lê da view wedding_rsvp_summary (CLAUDE.md, seção 13) — agregação feita no
 * banco, não em memória na aplicação.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('rsvp_mode, rsvp_deadline')
    .eq('id', weddingId)
    .single()

  if (weddingError) {
    throw badRequestError(weddingError.message)
  }

  const { data: summary, error: summaryError } = await client
    .from('wedding_rsvp_summary')
    .select('*')
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (summaryError) {
    throw badRequestError(summaryError.message)
  }

  const totalGuests = summary?.total_guests ?? 0
  const totalGroups = summary?.total_groups ?? 0
  const responsesConfirmed = summary?.responses_confirmed ?? 0
  const responsesDeclined = summary?.responses_declined ?? 0
  const totalCompanionsConfirmed = summary?.total_companions_confirmed ?? 0

  // "pending" não é uma contagem gravada (confirm_rsvp() nunca escreve esse
  // status) — é total de unidades convidadas menos quem já respondeu, onde
  // a unidade (grupo ou convidado) depende de weddings.rsvp_mode.
  const totalInvitedUnits = wedding.rsvp_mode === 'per_group' ? totalGroups : totalGuests
  const responsesPending = Math.max(0, totalInvitedUnits - responsesConfirmed - responsesDeclined)

  return {
    rsvpMode: wedding.rsvp_mode,
    rsvpDeadline: wedding.rsvp_deadline,
    totalGuests,
    totalGroups,
    totalInvitedUnits,
    responsesConfirmed,
    responsesDeclined,
    responsesPending,
    totalCompanionsConfirmed,
  }
})
