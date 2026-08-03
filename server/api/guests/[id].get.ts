import { serverSupabaseClient } from '#supabase/server'

/**
 * Detalhe de um convidado + seus Acompanhantes (mesmo party_id, ordenados
 * por party_order) — usado pelo wizard ao editar e pela sugestão automática
 * na tela de Convites (CLAUDE.md, seção 12.1).
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convidado não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data: guest, error } = await client
    .from('guests')
    .select('*')
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!guest) throw notFoundError('Convidado não encontrado.')

  let partyMembers: typeof guest[] = []
  let invite: { id: string; name: string } | null = null

  if (guest.party_id) {
    const { data: members, error: membersError } = await client
      .from('guests')
      .select('*')
      .eq('party_id', guest.party_id)
      .neq('id', id)
      .is('deleted_at', null)
      .order('party_order', { ascending: true })

    if (membersError) throw badRequestError(membersError.message)
    partyMembers = members ?? []
  }

  if (guest.invite_id) {
    const { data: inviteRow, error: inviteError } = await client
      .from('invites')
      .select('id, name')
      .eq('id', guest.invite_id)
      .maybeSingle()

    if (inviteError) throw badRequestError(inviteError.message)
    invite = inviteRow
  }

  return { ...guest, partyMembers, invite }
})
