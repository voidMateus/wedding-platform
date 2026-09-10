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

type ResponseStatus = 'pendente' | 'confirmado' | 'recusado' | 'lista_espera'

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
      // Rascunho da lista não é convidado: contá-lo aqui faria o número do
      // grupo divergir do número da listagem, que o exclui (CLAUDE.md,
      // seção 12 — ver convidados.em_consideracao).
      .eq('em_consideracao', false)
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

  // O convidado aponta sempre para a folha (`convidados.grupo_id`), então o
  // grupo-pai não tem convidado nenhum "por herança" — quem está em "Tios
  // paternos" não conta em "Família do Mateus" sem esta soma. Os dois números
  // são expostos porque as duas telas querem coisas diferentes: a linha da
  // subdivisão mostra o próprio total, e o cabeçalho do grupo-pai no Modo
  // Lista mostra o consolidado ("Família do Mateus — 32 pessoas").
  //
  // A soma percorre os grupos da PÁGINA e busca as subdivisões no mesmo
  // conjunto. Isso é correto hoje porque a lista de grupos nunca pagina de
  // fato (pageSize 100 e todas as telas pedem tudo); se algum dia paginar, o
  // total do pai precisará ser agregado no banco, como o de convidados.
  const grupos = groupsResult.data ?? []
  const subdivisoesPorPai = new Map<string, string[]>()
  for (const grupo of grupos) {
    if (!grupo.grupo_pai_id) continue
    const irmas = subdivisoesPorPai.get(grupo.grupo_pai_id) ?? []
    irmas.push(grupo.id)
    subdivisoesPorPai.set(grupo.grupo_pai_id, irmas)
  }

  const data = grupos.map((group) => {
    const guestCount = guestCountByGroup.get(group.id) ?? 0
    const confirmedCount = confirmedCountByGroup.get(group.id) ?? 0
    const subdivisoes = subdivisoesPorPai.get(group.id) ?? []

    return {
      ...group,
      guestCount,
      confirmedCount,
      guestCountTotal:
        guestCount + subdivisoes.reduce((soma, id) => soma + (guestCountByGroup.get(id) ?? 0), 0),
      confirmedCountTotal:
        confirmedCount +
        subdivisoes.reduce((soma, id) => soma + (confirmedCountByGroup.get(id) ?? 0), 0),
      subdivisionCount: subdivisoes.length,
    }
  })

  return {
    data,
    meta: { page, pageSize, total: groupsResult.count ?? 0 },
  }
})
