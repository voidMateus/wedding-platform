import { serverSupabaseClient } from '#supabase/server'
import type { InviteDetail, InviteMember } from '~/types/invite'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  // Da VIEW, não da tabela: é ela que decide o estágio do funil, e o detalhe
  // tem de mostrar o mesmo que a listagem. Ler de `convites` obrigava a
  // recalcular a regra aqui — e a versão em TypeScript não sabia nada sobre
  // "aberto", então detalhe e listagem passariam a discordar.
  const { data: inviteRow, error } = await client
    .from('convites_com_resumo')
    .select('*')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!inviteRow) {
    throw notFoundError('Convite não encontrado.')
  }

  const { total_membros, total_respondidos, status_operacional, estagio_desde, ...invite } =
    inviteRow

  const [guestsResult, responsesResult, tagLinksResult] = await Promise.all([
    client
      .from('convidados')
      .select('id, nome_completo, apelido, nucleo_id, ordem_nucleo')
      .eq('convite_id', id)
      .is('excluido_em', null),
    client.from('respostas_rsvp').select('convidado_id, status_rsvp').eq('convite_id', id),
    client
      .from('vinculos_convite_etiqueta')
      .select('etiqueta_id, etiquetas_convite(id, casamento_id, nome, created_at, updated_at)')
      .eq('convite_id', id),
  ])

  if (guestsResult.error) throw badRequestError(guestsResult.error.message)
  if (responsesResult.error) throw badRequestError(responsesResult.error.message)
  if (tagLinksResult.error) throw badRequestError(tagLinksResult.error.message)

  const statusByGuest = new Map(
    responsesResult.data?.map((r) => [r.convidado_id, r.status_rsvp]) ?? [],
  )

  const members: InviteMember[] = ordenarMembrosDoConvite(guestsResult.data ?? []).map((guest) => ({
    id: guest.id,
    fullName: guest.nome_completo,
    nickname: guest.apelido,
    partyId: guest.nucleo_id,
    isResponsible: guest.id === invite.convidado_responsavel_id,
    rsvpStatus: (statusByGuest.get(guest.id) ?? 'pendente') as InviteMember['rsvpStatus'],
  }))

  const tags = (tagLinksResult.data ?? [])
    .map((link) => link.etiquetas_convite)
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))

  const result: InviteDetail = {
    ...(invite as unknown as InviteDetail),
    stage: inviteStageFromView(status_operacional),
    memberCount: total_membros ?? 0,
    respondedCount: total_respondidos ?? 0,
    stageSince: estagio_desde,
    members,
    tags,
  }

  return result
})
