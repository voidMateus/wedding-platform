import type { supabaseAdmin } from './supabase-admin'

/**
 * Monta o payload completo do RSVP de um convite — reaproveitado pelo
 * atalho de link direto (/rsvp/[code]) e pela confirmação leve da busca por
 * nome (CLAUDE.md, seção 12.1/14.3), para nunca duplicar essa montagem.
 */
export async function buildRsvpInvitePayload(
  client: Awaited<ReturnType<typeof supabaseAdmin>>,
  weddingId: string,
  inviteId: string,
) {
  const [weddingResult, inviteResult, membersResult] = await Promise.all([
    client
      .from('weddings')
      .select('couple_names, event_date, rsvp_deadline, guest_list_mode')
      .eq('id', weddingId)
      .single(),
    client
      .from('invites')
      .select('id, name, max_companions, rsvp_message')
      .eq('id', inviteId)
      .single(),
    client
      .from('guests')
      .select('id, full_name, nickname, dietary_restrictions, party_order')
      .eq('invite_id', inviteId)
      .is('deleted_at', null)
      .order('party_order', { ascending: true }),
  ])

  if (weddingResult.error || !weddingResult.data) {
    throw badRequestError(weddingResult.error?.message ?? 'Casamento não encontrado.')
  }
  if (inviteResult.error || !inviteResult.data) {
    throw badRequestError(inviteResult.error?.message ?? 'Convite não encontrado.')
  }
  if (membersResult.error) {
    throw badRequestError(membersResult.error.message)
  }

  const memberIds = (membersResult.data ?? []).map((m) => m.id)
  const { data: responses, error: responsesError } = memberIds.length
    ? await client.from('rsvp_responses').select('guest_id, status').in('guest_id', memberIds)
    : { data: [], error: null }

  if (responsesError) {
    throw badRequestError(responsesError.message)
  }

  const statusByGuest = new Map(responses?.map((r) => [r.guest_id, r.status]) ?? [])
  const wedding = weddingResult.data
  const invite = inviteResult.data

  const isPastDeadline = Boolean(
    wedding.rsvp_deadline && new Date(wedding.rsvp_deadline).getTime() < Date.now(),
  )

  return {
    inviteId: invite.id,
    wedding: {
      coupleNames: wedding.couple_names,
      eventDate: wedding.event_date,
      rsvpDeadline: wedding.rsvp_deadline,
      guestListMode: wedding.guest_list_mode,
    },
    isPastDeadline,
    maxCompanions: invite.max_companions,
    message: invite.rsvp_message,
    members: (membersResult.data ?? []).map((guest) => ({
      guestId: guest.id,
      fullName: guest.full_name,
      nickname: guest.nickname,
      dietaryRestrictions: guest.dietary_restrictions,
      status: (statusByGuest.get(guest.id) ?? 'pending') as
        | 'pending'
        | 'confirmed'
        | 'declined'
        | 'waitlisted'
        | 'removed',
    })),
  }
}

/** Registra rsvp.first_access na primeira vez que o convite é aberto (idempotente). */
export async function recordFirstAccessIfNeeded(
  client: Awaited<ReturnType<typeof supabaseAdmin>>,
  weddingId: string,
  inviteId: string,
) {
  const { data: existing } = await client
    .from('invite_events')
    .select('id')
    .eq('invite_id', inviteId)
    .eq('event_type', 'rsvp.first_access')
    .limit(1)
    .maybeSingle()

  if (existing) return

  await client.from('invite_events').insert({
    wedding_id: weddingId,
    invite_id: inviteId,
    event_type: 'rsvp.first_access',
    metadata: { source: 'public_site' },
  })
}
