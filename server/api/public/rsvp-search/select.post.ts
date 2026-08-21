import { rsvpSelectSchema } from '#shared/schemas/rsvp'

/**
 * Confirmação leve (CLAUDE.md, seção 12.1) — antes de revelar dados
 * completos, mostra os nomes mascarados dos demais membros do mesmo convite
 * para reduzir clique errado/curiosidade casual. Nunca retorna guestId de
 * terceiros, só do próprio convidado selecionado.
 */
export default defineEventHandler(async (event) => {
  const { guestId } = await validateBody(event, rsvpSelectSchema)

  const client = supabaseAdmin(event)

  const { data: guest, error } = await client
    .from('convidados')
    .select('id, convite_id')
    .eq('id', guestId)
    .is('excluido_em', null)
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!guest || !guest.convite_id) {
    throw notFoundError('Convidado não encontrado.')
  }

  const { data: members, error: membersError } = await client
    .from('convidados')
    .select('id, nome_completo')
    .eq('convite_id', guest.convite_id)
    .neq('id', guestId)
    .is('excluido_em', null)

  if (membersError) throw badRequestError(membersError.message)

  return {
    guestId,
    maskedNames: (members ?? []).map((m) => maskName(m.nome_completo)),
  }
})
