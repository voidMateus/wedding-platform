import { serverSupabaseClient } from '#supabase/server'
import type { InviteDetail, InviteMember, InviteResponseStatus } from '~/types/invite'

function computeResponseStatus(statuses: string[]): InviteResponseStatus {
  if (statuses.length === 0) return 'pending'
  const responded = statuses.filter((s) => s !== 'pendente').length
  if (responded === 0) return 'pending'
  if (responded === statuses.length) return 'responded'
  return 'partial'
}

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data: invite, error } = await client
    .from('convites')
    .select('*')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!invite) {
    throw notFoundError('Convite não encontrado.')
  }

  const [guestsResult, responsesResult, tagLinksResult] = await Promise.all([
    client
      .from('convidados')
      .select('id, nome_completo, apelido, ordem_nucleo')
      .eq('convite_id', id)
      .is('excluido_em', null)
      .order('ordem_nucleo', { ascending: true }),
    client.from('respostas_rsvp').select('convidado_id, status_rsvp').eq('convite_id', id),
    client.from('vinculos_convite_etiqueta').select('etiqueta_id, etiquetas_convite(id, casamento_id, nome, created_at, updated_at)').eq('convite_id', id),
  ])

  if (guestsResult.error) throw badRequestError(guestsResult.error.message)
  if (responsesResult.error) throw badRequestError(responsesResult.error.message)
  if (tagLinksResult.error) throw badRequestError(tagLinksResult.error.message)

  const statusByGuest = new Map(responsesResult.data?.map((r) => [r.convidado_id, r.status_rsvp]) ?? [])

  const members: InviteMember[] = (guestsResult.data ?? []).map((guest) => ({
    id: guest.id,
    fullName: guest.nome_completo,
    nickname: guest.apelido,
    partyOrder: guest.ordem_nucleo,
    isResponsible: guest.id === invite.convidado_responsavel_id,
    rsvpStatus: (statusByGuest.get(guest.id) ?? 'pending') as InviteMember['rsvpStatus'],
  }))

  const tags = (tagLinksResult.data ?? [])
    .map((link) => link.etiquetas_convite)
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))

  const result: InviteDetail = {
    ...invite,
    responseStatus: computeResponseStatus(members.map((m) => m.rsvpStatus)),
    members,
    tags,
  }

  return result
})
