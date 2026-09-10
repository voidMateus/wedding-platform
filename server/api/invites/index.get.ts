import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import type { Invite, InviteListItem } from '~/types/invite'

// A tradução do estágio (banco <-> DTO) vive em server/utils/invite-stage.ts:
// o detalhe do convite precisa da mesma, e antes ele reimplementava a regra.

/**
 * Ordenação pedida pela coluna correspondente da tabela do admin. "Responsável"
 * fica de fora de propósito: o nome vem de uma segunda consulta (`convidados`),
 * depois da paginação — ordenar por ele reordenaria só a página carregada.
 */
const SORT_COLUMNS = {
  nome: 'nome',
  pessoas: 'total_membros',
  enviado: 'enviado_em',
} as const

const querySchema = paginationQuerySchema(25).extend({
  search: z.string().trim().max(200).optional(),
  /**
   * Arquivar é o soft delete do convite: 'active' (padrão) esconde arquivados,
   * 'archived' mostra só eles — o recorte que a tela oferece — e 'all' junta os
   * dois. Substituiu o antigo `includeArchived`, que não sabia dizer "só os
   * arquivados" e obrigava a tela a recortar no client, sobre a página
   * carregada.
   */
  archived: z.enum(['active', 'archived', 'all']).default('active'),
  stage: queryList(z.enum(['not_sent', 'sent', 'opened', 'partial', 'responded'])),
  sort: z.enum(['nome', 'pessoas', 'enviado']).optional(),
  dir: z.enum(['asc', 'desc']).default('asc'),
})

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const {
    page = 1,
    pageSize = 25,
    search,
    archived,
    stage,
    sort,
    dir,
  } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Leitura da view, não da tabela: "quantas pessoas" e "respondeu?" precisam
  // existir ANTES da paginação, senão filtrar e ordenar por eles recortaria só
  // a página carregada — e um convite pendente que caísse na página 2 sumiria
  // do recorte. Ver a migration 20260904190001_convites_com_resumo.
  let query = client
    .from('convites_com_resumo')
    .select('*', { count: 'exact' })
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)

  if (archived === 'active') {
    query = query.is('arquivado_em', null)
  } else if (archived === 'archived') {
    query = query.not('arquivado_em', 'is', null)
  }
  if (search) {
    query = query.ilike('nome', `%${search}%`)
  }
  if (stage?.length) {
    // No banco, antes de paginar: recortar no client filtraria só os 25 da
    // página — é por isso que o estágio é derivado na view e não na tela.
    query = query.in('status_operacional', stage.map(inviteStageToView))
  }

  // Ordem padrão continua sendo o mais recente primeiro — `sort` ausente não
  // muda nada do que a tela já mostrava. `nullsFirst: false` importa em
  // "Enviado em": convite não enviado vai para o fim nos dois sentidos, em vez
  // de encabeçar a lista por ser nulo.
  const orderColumn = sort ? SORT_COLUMNS[sort] : 'created_at'
  const ascending = sort ? dir !== 'desc' : false

  const {
    data: rows,
    error,
    count,
  } = await query.order(orderColumn, { ascending, nullsFirst: false }).range(from, to)

  if (error) {
    throw badRequestError(error.message)
  }

  const responsibleIds = rows
    .map((invite) => invite.convidado_responsavel_id)
    .filter((id): id is string => Boolean(id))

  const responsibleResult = responsibleIds.length
    ? await client.from('convidados').select('id, nome_completo').in('id', responsibleIds)
    : { data: [], error: null }

  if (responsibleResult.error) throw badRequestError(responsibleResult.error.message)

  const responsibleNameById = new Map<string, string>()
  for (const guest of responsibleResult.data ?? []) {
    responsibleNameById.set(guest.id, guest.nome_completo)
  }

  const data: InviteListItem[] = rows.map((row) => {
    // A view não declara NOT NULL em coluna nenhuma (o Postgres não infere isso
    // para view), então o tipo gerado sai todo anulável. As colunas vêm 1:1 de
    // `convites`, onde id/nome/casamento_id são NOT NULL — o resto do objeto é
    // uma linha de convite com três colunas derivadas a mais, que ficam aqui e
    // não no DTO.
    const { total_membros, total_respondidos, status_operacional, ...invite } = row

    return {
      ...(invite as unknown as Invite),
      responsibleGuestName: invite.convidado_responsavel_id
        ? (responsibleNameById.get(invite.convidado_responsavel_id) ?? null)
        : null,
      memberCount: total_membros ?? 0,
      respondedCount: total_respondidos ?? 0,
      stage: inviteStageFromView(status_operacional),
    }
  })

  return {
    data,
    meta: { page, pageSize, total: count ?? 0 },
  }
})
