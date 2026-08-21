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
      .from('casamentos')
      .select('nomes_noivos, data_evento, prazo_rsvp, modo_lista_convidados')
      .eq('id', weddingId)
      .single(),
    client
      .from('convites')
      .select('id, nome, max_acompanhantes, mensagem_rsvp')
      .eq('id', inviteId)
      .single(),
    client
      .from('convidados')
      .select('id, nome_completo, apelido, restricoes_alimentares, ordem_nucleo')
      .eq('convite_id', inviteId)
      .is('excluido_em', null)
      .order('ordem_nucleo', { ascending: true }),
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
    ? await client.from('respostas_rsvp').select('convidado_id, status_rsvp').in('convidado_id', memberIds)
    : { data: [], error: null }

  if (responsesError) {
    throw badRequestError(responsesError.message)
  }

  const statusByGuest = new Map(responses?.map((r) => [r.convidado_id, r.status_rsvp]) ?? [])
  const wedding = weddingResult.data
  const invite = inviteResult.data

  const isPastDeadline = Boolean(
    wedding.prazo_rsvp && new Date(wedding.prazo_rsvp).getTime() < Date.now(),
  )

  return {
    inviteId: invite.id,
    wedding: {
      coupleNames: wedding.nomes_noivos,
      eventDate: wedding.data_evento,
      rsvpDeadline: wedding.prazo_rsvp,
      guestListMode: wedding.modo_lista_convidados,
    },
    isPastDeadline,
    maxCompanions: invite.max_acompanhantes,
    message: invite.mensagem_rsvp,
    members: (membersResult.data ?? []).map((guest) => ({
      guestId: guest.id,
      fullName: guest.nome_completo,
      nickname: guest.apelido,
      dietaryRestrictions: guest.restricoes_alimentares,
      status: (statusByGuest.get(guest.id) ?? 'pendente') as
        | 'pendente'
        | 'confirmado'
        | 'recusado'
        | 'lista_espera'
        | 'removido',
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
    .from('historico_convite')
    .select('id')
    .eq('convite_id', inviteId)
    .eq('tipo_evento', 'rsvp.first_access')
    .limit(1)
    .maybeSingle()

  if (existing) return

  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: inviteId,
    tipo_evento: 'rsvp.first_access',
    metadados: { source: 'public_site' },
  })
}
