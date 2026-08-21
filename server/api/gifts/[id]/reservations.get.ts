import { serverSupabaseClient } from '#supabase/server'

/**
 * Quem reservou/contribuiu com o quê (CLAUDE.md, seção 18.3/19.2) — só
 * visível ao painel administrativo, nunca na vitrine pública.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data: gift, error: giftError } = await client
    .from('presentes')
    .select('id')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .maybeSingle()
  if (giftError) {
    throw badRequestError(giftError.message)
  }
  if (!gift) {
    throw notFoundError('Presente não encontrado.')
  }

  const { data: reservations, error: reservationsError } = await client
    .from('reservas_presentes')
    .select('id, convidado_id, convite_id, nome_contribuinte, telefone_presenteador, reservado_em, mensagem')
    .eq('presente_id', id)
    .order('reservado_em', { ascending: true })
  if (reservationsError) {
    throw badRequestError(reservationsError.message)
  }

  const { data: contributions, error: contributionsError } = await client
    .from('contribuicoes_presentes')
    .select('id, convidado_id, convite_id, nome_contribuinte, telefone_presenteador, valor_centavos, contribuido_em, mensagem, quantidade_cotas')
    .eq('presente_id', id)
    .order('contribuido_em', { ascending: true })
  if (contributionsError) {
    throw badRequestError(contributionsError.message)
  }

  const { data: confirmedPayments } = await client
    .from('pagamentos_presentes')
    .select('reserva_resultante_id, contribuicao_resultante_id')
    .eq('presente_id', id)
    .eq('status_pagamento', 'confirmado')

  const paidReservationIds = new Set(
    (confirmedPayments ?? []).map((p) => p.reserva_resultante_id).filter((v): v is string => Boolean(v)),
  )
  const paidContributionIds = new Set(
    (confirmedPayments ?? []).map((p) => p.contribuicao_resultante_id).filter((v): v is string => Boolean(v)),
  )

  const guestIds = [
    ...(reservations ?? []).map((r) => r.convidado_id),
    ...(contributions ?? []).map((c) => c.convidado_id),
  ].filter((v): v is string => Boolean(v))
  const groupIds = [
    ...(reservations ?? []).map((r) => r.convite_id),
    ...(contributions ?? []).map((c) => c.convite_id),
  ].filter((v): v is string => Boolean(v))

  const guestNames = new Map<string, string>()
  if (guestIds.length > 0) {
    const { data } = await client.from('convidados').select('id, nome_completo').in('id', guestIds)
    for (const g of data ?? []) guestNames.set(g.id, g.nome_completo)
  }

  const groupNames = new Map<string, string>()
  if (groupIds.length > 0) {
    const { data } = await client.from('convites').select('id, nome').in('id', groupIds)
    for (const g of data ?? []) groupNames.set(g.id, g.nome)
  }

  // nome_contribuinte é o nome da pessoa específica que presenteou (coletada
  // no passo de identificação, CLAUDE.md seção 18) — sempre preferido sobre
  // o nome do convidado/convite, que hoje é só o rótulo do grupo (ex.:
  // "Família Silva"), não da pessoa. inviteName fica como contexto adicional.
  function resolveName(
    guestId: string | null,
    groupId: string | null,
    contributorName: string | null,
  ) {
    if (contributorName) return contributorName
    if (guestId) return guestNames.get(guestId) ?? 'Convidado removido'
    if (groupId) return groupNames.get(groupId) ?? 'Convite removido'
    return 'Anônimo'
  }

  function resolveInviteName(groupId: string | null) {
    return groupId ? (groupNames.get(groupId) ?? 'Convite removido') : null
  }

  return {
    reservations: (reservations ?? []).map((r) => ({
      id: r.id,
      name: resolveName(r.convidado_id, r.convite_id, r.nome_contribuinte),
      inviteName: resolveInviteName(r.convite_id),
      phone: r.telefone_presenteador,
      reservedAt: r.reservado_em,
      message: r.mensagem,
      isPaid: paidReservationIds.has(r.id),
    })),
    contributions: (contributions ?? []).map((c) => ({
      id: c.id,
      name: resolveName(c.convidado_id, c.convite_id, c.nome_contribuinte),
      inviteName: resolveInviteName(c.convite_id),
      phone: c.telefone_presenteador,
      amountCents: c.valor_centavos,
      contributedAt: c.contribuido_em,
      message: c.mensagem,
      quotaCount: c.quantidade_cotas,
      isPaid: paidContributionIds.has(c.id),
    })),
  }
})
