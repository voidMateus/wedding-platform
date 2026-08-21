import { serverSupabaseClient } from '#supabase/server'

/**
 * Detalhe de um convidado + seus Acompanhantes (mesmo nucleo_id, ordenados
 * por ordem_nucleo) — usado pelo wizard ao editar e pela sugestão automática
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
    .from('convidados')
    .select('*')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!guest) throw notFoundError('Convidado não encontrado.')

  let partyMembers: typeof guest[] = []
  let invite: { id: string; nome: string } | null = null

  if (guest.nucleo_id) {
    const { data: members, error: membersError } = await client
      .from('convidados')
      .select('*')
      .eq('nucleo_id', guest.nucleo_id)
      .neq('id', id)
      .is('excluido_em', null)
      .order('ordem_nucleo', { ascending: true })

    if (membersError) throw badRequestError(membersError.message)
    partyMembers = members ?? []
  }

  if (guest.convite_id) {
    const { data: inviteRow, error: inviteError } = await client
      .from('convites')
      .select('id, nome')
      .eq('id', guest.convite_id)
      .maybeSingle()

    if (inviteError) throw badRequestError(inviteError.message)
    invite = inviteRow
  }

  return { ...guest, partyMembers, invite }
})
