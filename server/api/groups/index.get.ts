import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

// pageSize default 100 (não 25 como guests/invites) porque grupos é lista
// curta tipo "tag" — todas as telas hoje pedem a lista inteira de uma vez,
// nunca paginam de fato (ver call sites de listGroups()).
const querySchema = paginationQuerySchema(100).extend({
  // Arquivar um grupo é o próprio soft delete (ver [id]/archive.post.ts), então
  // a lista só os traz sob pedido — a tela de grupos usa isso para o recorte
  // "Arquivados"; todo o resto do admin continua vendo só os ativos.
  includeArchived: z.coerce.boolean().optional(),
})

type ResponseStatus = 'pendente' | 'confirmado' | 'recusado' | 'lista_espera' | 'removido'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { page = 1, pageSize = 100, includeArchived } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Contagem de convidados/confirmados por grupo (guestCount/confirmedCount)
  // é agregada aqui, não no client: o único jeito de fazer isso no client
  // seria baixar a lista inteira de convidados, que é paginada — a conta sairia
  // errada em qualquer casamento com mais convidados que uma página. Mesmo
  // padrão de resolução de status do dashboard (respostas_rsvp tem no máximo
  // uma linha por convidado, ausência = pendente).
  let groupsQuery = client
    .from('grupos')
    .select('*', { count: 'exact' })
    .eq('casamento_id', weddingId)
  if (!includeArchived) {
    groupsQuery = groupsQuery.is('excluido_em', null)
  }

  const [groupsResult, guestsResult, responsesResult] = await Promise.all([
    groupsQuery.order('nome', { ascending: true }).range(from, to),
    client
      .from('convidados')
      .select('id, grupo_id')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .not('grupo_id', 'is', null),
    client.from('respostas_rsvp').select('convidado_id, status_rsvp').eq('casamento_id', weddingId),
  ])

  if (groupsResult.error) {
    throw badRequestError(groupsResult.error.message)
  }
  if (guestsResult.error) {
    throw badRequestError(guestsResult.error.message)
  }
  if (responsesResult.error) {
    throw badRequestError(responsesResult.error.message)
  }

  const statusByGuest = new Map<string, ResponseStatus>()
  for (const response of responsesResult.data ?? []) {
    statusByGuest.set(response.convidado_id, response.status_rsvp as ResponseStatus)
  }

  const guestCountByGroup = new Map<string, number>()
  const confirmedCountByGroup = new Map<string, number>()
  for (const guest of guestsResult.data ?? []) {
    if (!guest.grupo_id) continue
    guestCountByGroup.set(guest.grupo_id, (guestCountByGroup.get(guest.grupo_id) ?? 0) + 1)
    if (statusByGuest.get(guest.id) === 'confirmado') {
      confirmedCountByGroup.set(
        guest.grupo_id,
        (confirmedCountByGroup.get(guest.grupo_id) ?? 0) + 1,
      )
    }
  }

  const data = (groupsResult.data ?? []).map((group) => ({
    ...group,
    guestCount: guestCountByGroup.get(group.id) ?? 0,
    confirmedCount: confirmedCountByGroup.get(group.id) ?? 0,
  }))

  return {
    data,
    meta: { page, pageSize, total: groupsResult.count ?? 0 },
  }
})
