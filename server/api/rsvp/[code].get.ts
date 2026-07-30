/**
 * Resolve o código de acesso do convidado/grupo e retorna os dados
 * necessários para o formulário de RSVP — sem sessão, sem token de admin
 * (CLAUDE.md, seção 4.5/14.3). Usa a service_role key: a autorização aqui é
 * inteiramente responsabilidade deste handler, não de RLS — nunca retorna
 * nada além do que pertence estritamente a este guest/group.
 */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  if (!code) {
    throw badRequestError('Código não informado.')
  }

  const client = supabaseAdmin(event)
  const codeHash = hashAccessCode(code)

  const { data: token, error: tokenError } = await client
    .from('guest_access_tokens')
    .select('wedding_id, guest_id, group_id, revoked_at')
    .eq('code_hash', codeHash)
    .maybeSingle()

  if (tokenError) {
    throw badRequestError(tokenError.message)
  }
  if (!token || token.revoked_at) {
    throw notFoundError('Link inválido ou expirado.')
  }

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('couple_names, event_date, rsvp_mode, rsvp_deadline')
    .eq('id', token.wedding_id)
    .single()

  if (weddingError) {
    throw badRequestError(weddingError.message)
  }

  let displayName: string
  let maxMembers: number

  if (token.guest_id) {
    const { data: guest, error: guestError } = await client
      .from('guests')
      .select('full_name, group_id')
      .eq('id', token.guest_id)
      .single()
    if (guestError || !guest) {
      throw notFoundError('Convidado não encontrado.')
    }

    const { data: group, error: groupError } = await client
      .from('guest_groups')
      .select('max_members')
      .eq('id', guest.group_id)
      .single()
    if (groupError || !group) {
      throw notFoundError('Grupo do convidado não encontrado.')
    }

    displayName = guest.full_name
    maxMembers = group.max_members
  } else {
    const { data: group, error: groupError } = await client
      .from('guest_groups')
      .select('name, max_members')
      .eq('id', token.group_id as string)
      .single()
    if (groupError || !group) {
      throw notFoundError('Grupo não encontrado.')
    }

    displayName = group.name
    maxMembers = group.max_members
  }

  const responseColumn = token.guest_id ? 'guest_id' : 'group_id'
  const responseValue = token.guest_id ?? (token.group_id as string)

  const { data: rsvpResponse, error: responseError } = await client
    .from('rsvp_responses')
    .select('id, status, dietary_notes, message')
    .eq(responseColumn, responseValue)
    .maybeSingle()

  if (responseError) {
    throw badRequestError(responseError.message)
  }

  let companions: { fullName: string; dietaryRestrictions: string | null }[] = []
  if (rsvpResponse) {
    const { data: companionRows, error: companionsError } = await client
      .from('companions')
      .select('full_name, dietary_restrictions')
      .eq('rsvp_response_id', rsvpResponse.id)

    if (companionsError) {
      throw badRequestError(companionsError.message)
    }

    companions = (companionRows ?? []).map((c) => ({
      fullName: c.full_name,
      dietaryRestrictions: c.dietary_restrictions,
    }))
  }

  const isPastDeadline = Boolean(
    wedding.rsvp_deadline && new Date(wedding.rsvp_deadline).getTime() < Date.now(),
  )

  return {
    wedding: {
      coupleNames: wedding.couple_names,
      eventDate: wedding.event_date,
      rsvpMode: wedding.rsvp_mode,
      rsvpDeadline: wedding.rsvp_deadline,
    },
    guestId: token.guest_id,
    groupId: token.group_id,
    displayName,
    maxMembers,
    isPastDeadline,
    response: rsvpResponse
      ? {
          status: rsvpResponse.status,
          dietaryNotes: rsvpResponse.dietary_notes,
          message: rsvpResponse.message,
          companions,
        }
      : null,
  }
})
