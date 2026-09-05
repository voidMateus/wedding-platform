import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA } from '#shared/utils/faixa-etaria'

const querySchema = paginationQuerySchema(25).extend({
  search: z.string().trim().max(200).optional(),
  groupId: z.string().uuid().optional(),
  unassigned: z.coerce.boolean().optional(),
  withoutParty: z.coerce.boolean().optional(),
  // Faixa etária calculada na data do evento — nunca uma coluna de
  // `convidados`, sempre um recorte derivado (CLAUDE.md, seção 12).
  ageGroup: z.enum([...FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA]).optional(),
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
    sort,
    dir,
  } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('convidados')
    .select('*', { count: 'exact' })
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)

  // Total de confirmados do MESMO recorte, contado no banco (join interno com
  // respostas_rsvp + `head`, sem trazer linha nenhuma). Não dá pra somar isso
  // no client: a lista é paginada, então o client só enxerga uma página. E não
  // dá pra baixar respostas_rsvp inteira pra contar aqui: o select do Supabase
  // corta em 1000 linhas por padrão, e a conta sairia silenciosamente menor num
  // casamento grande. `respostas_rsvp` tem no máximo uma linha por convidado
  // (índice único parcial em convidado_id), então o join não duplica ninguém.
  //
  // Todo recorte novo precisa entrar NAS DUAS consultas: se um filtro valer só
  // para a página, o "N confirmados" passa a descrever uma lista diferente da
  // que está na tela.
  let confirmedQuery = client
    .from('convidados')
    .select('id, respostas_rsvp!inner(status_rsvp)', { count: 'exact', head: true })
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .eq('respostas_rsvp.status_rsvp', 'confirmado')

  if (ageGroup) {
    // Traduzido para intervalo de datas de nascimento em vez de classificar
    // em memória: a lista é paginada e o "N confirmados" é contado no banco,
    // então um recorte feito no client descreveria uma lista diferente da que
    // está na tela. Quem não tem data de nascimento entra pela faixa manual —
    // e só nesse caso, porque a data sempre tem prioridade.
    const filtro = buildAgeGroupFilter(ageGroup, await loadAgeGroupContext(client, weddingId))
    query = query.or(filtro)
    confirmedQuery = confirmedQuery.or(filtro)
  }
  if (search) {
    query = query.ilike('nome_completo', `%${search}%`)
    confirmedQuery = confirmedQuery.ilike('nome_completo', `%${search}%`)
  }
  if (groupId) {
    query = query.eq('grupo_id', groupId)
    confirmedQuery = confirmedQuery.eq('grupo_id', groupId)
  }
  // Convidados ainda sem convite — usado pelo seletor "adicionar convidado"
  // na tela de detalhe do convite (CLAUDE.md, seção 12.1).
  if (unassigned) {
    query = query.is('convite_id', null)
    confirmedQuery = confirmedQuery.is('convite_id', null)
  }
  // Convidados que ainda não são acompanhantes de ninguém — usado pela busca
  // de "convidado já cadastrado" ao adicionar um acompanhante no wizard
  // (CLAUDE.md, seção 12.1), pra não sugerir alguém que já pertence a outro
  // grupo (sincronizar_nucleo_convidado ainda bloqueia o caso de convite
  // divergente, este filtro só evita a sugestão ambígua na UI).
  if (withoutParty) {
    query = query.is('nucleo_id', null)
    confirmedQuery = confirmedQuery.is('nucleo_id', null)
  }

  // Ordem padrão continua sendo nome ↑ — `sort` ausente não muda nada do que
  // as telas já mostravam. A ordenação não toca `confirmedQuery`: lá é uma
  // contagem (`head: true`), onde ordem não significa nada.
  const orderColumn = sort ? SORT_COLUMNS[sort] : 'nome_completo'

  const [pageResult, confirmedResult] = await Promise.all([
    query.order(orderColumn, { ascending: dir !== 'desc' }).range(from, to),
    confirmedQuery,
  ])

  if (pageResult.error) {
    throw badRequestError(pageResult.error.message)
  }
  if (confirmedResult.error) {
    throw badRequestError(confirmedResult.error.message)
  }

  return {
    data: pageResult.data,
    meta: { page, pageSize, total: pageResult.count ?? 0 },
    summary: { confirmed: confirmedResult.count ?? 0 },
  }
})
