import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA } from '#shared/utils/faixa-etaria'
import { RSVP_STATUS_VALUES } from '#shared/utils/rsvp-status'
import type { GuestListItem } from '~/types/guest'

const querySchema = paginationQuerySchema(25).extend({
  search: z.string().trim().max(200).optional(),
  // Multivalor (queryList) porque o filtro da coluna aceita marcar mais de uma
  // opção — dois grupos, duas faixas. Valor único continua entrando igual, então
  // as telas que só mandam um não mudaram.
  groupId: queryList(z.string().uuid()),
  unassigned: z.coerce.boolean().optional(),
  withoutParty: z.coerce.boolean().optional(),
  // Faixa etária calculada na data do evento — nunca uma coluna de
  // `convidados`, sempre um recorte derivado (CLAUDE.md, seção 12).
  ageGroup: queryList(z.enum([...FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA])),
  // "pendente" inclui quem nunca respondeu (não há linha em respostas_rsvp) —
  // é a view convidados_com_status que resolve isso, ver abaixo.
  statusRsvp: queryList(z.enum(RSVP_STATUS_VALUES)),
  // Rascunho da lista. Ausente = só convidados de verdade, que é o que todas as
  // telas anteriores ao Modo Lista esperam — o padrão nunca muda o que elas já
  // mostravam. `true` lista SÓ o rascunho (o painel "Em consideração"): os dois
  // conjuntos nunca aparecem misturados numa mesma tabela, senão a pergunta
  // "quantos convidados eu tenho?" perde resposta.
  emConsideracao: z.coerce.boolean().optional(),
  // Ordenação pedida pela coluna correspondente da tabela do admin. Só `nome`
  // por enquanto, e a lista curta é deliberada:
  // - Grupo só existe aqui como `grupo_id` (uuid), então ordenar por ele daria
  //   uma ordem sem significado nenhum pra quem lê a tela;
  // - Faixa etária é derivada da data de nascimento MAIS a faixa manual de
  //   quem não tem data (CLAUDE.md, seção 12) — não há coluna única que
  //   traduza essa regra em `order by`;
  // - Acompanhantes é contado por página, na aplicação.
  // Cada uma delas continua filtrável (o filtro tem tradução exata em SQL); o
  // que não entra aqui simplesmente não oferece ordenação na tela.
  sort: z.enum(['nome']).optional(),
  dir: z.enum(['asc', 'desc']).default('asc'),
})

const SORT_COLUMNS = { nome: 'nome_completo' } as const

/**
 * Métodos de filtro que `aplicarRecorte` usa. Genérico com auto-referência
 * (`Q extends FiltravelPor<Q>`) porque os builders do PostgREST devolvem
 * `this`: assim o helper serve às três consultas — que têm `select` diferente,
 * e portanto tipo de linha diferente — sem `any` e sem repetir o recorte.
 */
interface FiltravelPor<Q> {
  or(filtro: string): Q
  ilike(coluna: string, padrao: string): Q
  in(coluna: string, valores: readonly string[]): Q
  is(coluna: string, valor: null): Q
  eq(coluna: string, valor: string | boolean): Q
}

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const {
    page = 1,
    pageSize = 25,
    search,
    groupId,
    unassigned,
    withoutParty,
    ageGroup,
    statusRsvp,
    emConsideracao,
    sort,
    dir,
  } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Filtrar por um grupo-pai precisa alcançar quem está nas subdivisões dele:
  // o convidado aponta sempre para a folha, então "Família do Mateus" sozinho
  // deixaria de fora todo mundo que está em "Tios paternos".
  const gruposDoRecorte = groupId?.length
    ? await expandirGruposComSubdivisoes(client, weddingId, groupId)
    : groupId

  // Traduzida para intervalo de datas de nascimento em vez de classificada em
  // memória: a lista é paginada e as contagens são feitas no banco, então um
  // recorte feito no client descreveria uma lista diferente da que está na
  // tela. Quem não tem data de nascimento entra pela faixa manual — e só nesse
  // caso, porque a data sempre tem prioridade.
  //
  // Várias faixas marcadas viram uma união só: cada faixa já devolve uma lista
  // de condições `or`, e concatená-las mantém o sentido ("está em alguma
  // destas"), sem multiplicar consultas.
  let filtroFaixaEtaria: string | null = null
  if (ageGroup?.length) {
    const context = await loadAgeGroupContext(client, weddingId)
    filtroFaixaEtaria = ageGroup.map((faixa) => buildAgeGroupFilter(faixa, context)).join(',')
  }

  /**
   * O recorte é aplicado por uma função só, em vez de repetido consulta a
   * consulta, porque as três precisam descrever EXATAMENTE a mesma lista: se um
   * filtro valesse só para a página, o "N confirmados" do cabeçalho passaria a
   * descrever uma lista diferente da que está na tela. Filtro novo entra aqui
   * e vale para as três de uma vez.
   *
   * `em_consideracao` é o único recorte que fica fora: é justamente o que
   * separa as três consultas entre si.
   */
  function aplicarRecorte<Q extends FiltravelPor<Q>>(query: Q): Q {
    let recortada = query.eq('casamento_id', weddingId).is('excluido_em', null)
    if (filtroFaixaEtaria) {
      recortada = recortada.or(filtroFaixaEtaria)
    }
    if (search) {
      recortada = recortada.ilike('nome_completo', `%${search}%`)
    }
    if (gruposDoRecorte?.length) {
      recortada = recortada.in('grupo_id', gruposDoRecorte)
    }
    if (statusRsvp?.length) {
      recortada = recortada.in('status_rsvp', statusRsvp)
    }
    // Convidados ainda sem convite — usado pelo seletor "adicionar convidado"
    // na tela de detalhe do convite (CLAUDE.md, seção 12.1).
    if (unassigned) {
      recortada = recortada.is('convite_id', null)
    }
    // Convidados que ainda não são acompanhantes de ninguém — usado pela busca
    // de "convidado já cadastrado" ao adicionar um acompanhante no wizard
    // (CLAUDE.md, seção 12.1), pra não sugerir alguém que já pertence a outro
    // grupo (sincronizar_nucleo_convidado ainda bloqueia o caso de convite
    // divergente, este filtro só evita a sugestão ambígua na UI).
    if (withoutParty) {
      recortada = recortada.is('nucleo_id', null)
    }
    return recortada
  }

  // A leitura é da view, não da tabela: `respostas_rsvp` só ganha linha quando
  // alguém responde, então "pendente" é "sem linha OU status pendente" — e essa
  // condição não é expressável a partir de `convidados` (com `!inner` o
  // convidado que nunca respondeu some; com `!left` o filtro corta a resposta
  // embutida, não o convidado). A view resolve o status por linha respeitando a
  // RLS das duas tabelas (security_invoker), ver a migration
  // 20260904180001_convidados_com_status_rsvp.
  const query = aplicarRecorte(
    client.from('convidados_com_status').select('*', { count: 'exact' }),
  ).eq('em_consideracao', emConsideracao === true)

  // Total de confirmados do MESMO recorte, contado no banco (sem trazer linha
  // nenhuma, via `head`). Não dá pra somar isso no client: a lista é paginada,
  // então o client só enxerga uma página. E não dá pra baixar respostas_rsvp
  // inteira pra contar aqui: o select do Supabase corta em 1000 linhas por
  // padrão, e a conta sairia silenciosamente menor num casamento grande.
  // `respostas_rsvp` tem no máximo uma linha por convidado (índice único
  // parcial em convidado_id), então o join da view não duplica ninguém.
  const confirmedQuery = aplicarRecorte(
    client.from('convidados_com_status').select('id', { count: 'exact', head: true }),
  )
    .eq('em_consideracao', emConsideracao === true)
    .eq('status_rsvp', 'confirmado')

  // O rascunho é contado sempre, independente de qual conjunto está listado: o
  // cabeçalho do Modo Lista mostra "142 convidados + 18 em consideração" de uma
  // vez, e sem esta consulta o segundo número custaria uma segunda ida ao
  // servidor só para preencher um contador.
  const draftsQuery = aplicarRecorte(
    client.from('convidados_com_status').select('id', { count: 'exact', head: true }),
  ).eq('em_consideracao', true)

  // Ordem padrão continua sendo nome ↑ — `sort` ausente não muda nada do que
  // as telas já mostravam. A ordenação não toca as contagens: lá ordem não
  // significa nada.
  const orderColumn = sort ? SORT_COLUMNS[sort] : 'nome_completo'

  const [pageResult, confirmedResult, draftsResult] = await Promise.all([
    query.order(orderColumn, { ascending: dir !== 'desc' }).range(from, to),
    confirmedQuery,
    draftsQuery,
  ])

  if (pageResult.error) {
    throw badRequestError(pageResult.error.message)
  }
  if (confirmedResult.error) {
    throw badRequestError(confirmedResult.error.message)
  }
  if (draftsResult.error) {
    throw badRequestError(draftsResult.error.message)
  }

  // A view não declara NOT NULL em coluna nenhuma — o Postgres não infere isso
  // para view —, então o tipo gerado sai todo anulável. As colunas vêm 1:1 de
  // `convidados`, onde id/nome_completo/casamento_id são NOT NULL: cada linha é
  // um convidado com uma coluna derivada a mais.
  const rows = pageResult.data as unknown as GuestListItem[]

  // Estágio do convite de cada linha, numa segunda consulta em vez de join na
  // view: `convidados_com_status` é a leitura da lista, e pendurar nela o funil
  // de convites acoplaria duas views que mudam por motivos diferentes. São
  // poucos ids por página, e o mesmo padrão do nome do responsável em
  // /api/invites.
  const inviteIds = [...new Set(rows.map((row) => row.convite_id).filter(Boolean))] as string[]

  const stageByInvite = new Map<string, string>()
  if (inviteIds.length) {
    const { data: invites, error: invitesError } = await client
      .from('convites_com_resumo')
      .select('id, status_operacional')
      .in('id', inviteIds)
    if (invitesError) throw badRequestError(invitesError.message)
    for (const invite of invites ?? []) {
      if (invite.id) stageByInvite.set(invite.id, invite.status_operacional ?? 'nao_enviado')
    }
  }

  const data: GuestListItem[] = rows.map((row) => ({
    ...row,
    inviteStage: row.convite_id ? inviteStageFromView(stageByInvite.get(row.convite_id)) : null,
  }))

  return {
    data,
    meta: { page, pageSize, total: pageResult.count ?? 0 },
    summary: {
      confirmed: confirmedResult.count ?? 0,
      emConsideracao: draftsResult.count ?? 0,
    },
  }
})
