import { rsvpSelectSchema } from '#shared/schemas/rsvp'
import { maskName } from '#shared/utils/mask-name'

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
    .from('guests')
    .select('id, invite_id')
    .eq('id', guestId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!guest || !guest.invite_id) {
    throw notFoundError('Convidado não encontrado.')
  }

  const { data: members, error: membersError } = await client
    .from('guests')
    .select('id, full_name')
    .eq('invite_id', guest.invite_id)
    .neq('id', guestId)
    .is('deleted_at', null)

  if (membersError) throw badRequestError(membersError.message)

  return {
    guestId,
    maskedNames: (members ?? []).map((m) => maskName(m.full_name)),
  }
})
