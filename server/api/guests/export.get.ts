import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA } from '#shared/utils/faixa-etaria'
import { RSVP_STATUS_VALUES } from '#shared/utils/rsvp-status'
import {
  gerarCsvExportacao,
  nomeDoArquivoDaExportacao,
  type ConvidadoExportavel,
} from '#shared/utils/exportacao-convidados'

/**
 * Exportação de convidados em CSV (caminho administrativo — JWT + RLS).
 *
 * Aceita os **mesmos filtros** de `index.get.ts` de propósito: o casal
 * exporta o recorte que está vendo na tela. Um botão que sempre baixasse a
 * lista inteira contradiria os filtros logo acima dele.
 *
 * As colunas saem do catálogo de campos (`#shared/utils/campos-convidado`),
 * o mesmo que alimenta o importador e o gerador de modelo.
 */
const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  // Multivalor pelo mesmo motivo de `index.get.ts`: o filtro da coluna deixa
  // marcar mais de um grupo, mais de uma faixa, mais de um status. Um schema
  // de valor único aqui rejeitaria (400) exatamente o recorte que a tela
  // acabou de oferecer — e a promessa deste endpoint é exportar o que está na
  // tela, não uma lista parecida.
  groupId: queryList(z.string().uuid()),
  ageGroup: queryList(z.enum([...FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA])),
  statusRsvp: queryList(z.enum(RSVP_STATUS_VALUES)),
  // Mesmo padrão de `index.get.ts`: ausente exporta só convidados de verdade,
  // `true` exporta só o rascunho da lista.
  emConsideracao: z.coerce.boolean().optional(),
})

/**
 * O `select` do PostgREST corta em 1000 linhas por padrão (`max_rows` em
 * `supabase/config.toml`). Sem paginar, um casamento grande receberia um CSV
 * silenciosamente truncado — o pior modo de falha possível para uma
 * exportação, porque o arquivo *parece* completo.
 */
const TAMANHO_DA_PAGINA = 1000

/** Guarda de sanidade: o maior casamento real fica muito abaixo disso. */
const MAXIMO_DE_CONVIDADOS_EXPORTADOS = 20000

interface LinhaComJuncoes {
  id: string
  nome_completo: string
  apelido: string | null
  sexo: string | null
  data_nascimento: string | null
  faixa_etaria_manual: string | null
  email: string | null
  telefone: string | null
  papel_casamento: string | null
  observacoes: string | null
  status_rsvp: string | null
  grupos: { nome: string; grupo_pai: { nome: string } | null } | null
  convites: { nome: string } | null
}

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const { search, groupId, ageGroup, statusRsvp, emConsideracao } = validateQuery(
    event,
    querySchema,
  )

  const client = await serverSupabaseClient(event)
  const contextoFaixas = await loadAgeGroupContext(client, weddingId)

  // Igual à listagem: filtrar por um grupo-pai tem que alcançar quem está nas
  // subdivisões dele, senão o CSV sai menor que a tela que o ofereceu.
  const gruposDoRecorte = groupId?.length
    ? await expandirGruposComSubdivisoes(client, weddingId, groupId)
    : groupId

  const convidados: ConvidadoExportavel[] = []

  for (let pagina = 0; ; pagina++) {
    const de = pagina * TAMANHO_DA_PAGINA
    // A leitura é da view `convidados_com_status`, não da tabela, pelo mesmo
    // motivo de `index.get.ts`: "pendente" é "sem linha em respostas_rsvp OU
    // linha com status pendente", e essa condição não é expressável pelo
    // PostgREST a partir de `convidados` — com `!inner` some quem nunca
    // respondeu, com `!left` o filtro corta a resposta embutida e não o
    // convidado. Filtrar em memória também não serve aqui: a exportação é
    // paginada de 1000 em 1000, então o recorte precisa ser do banco.
    //
    // Nome do grupo e do convite continuam vindo por junção, sem N+1 e sem um
    // segundo teto de 1000 escondido numa tabela auxiliar.
    //
    // `convites!convite_id` é obrigatório, não estilo: existem DUAS relações
    // entre as tabelas (`convidados.convite_id` e o
    // `convites.convidado_responsavel_id` de volta), e sem a dica de coluna o
    // PostgREST recusa a consulta ("more than one relationship was found").
    let query = client
      .from('convidados_com_status')
      .select(
        'id, nome_completo, apelido, sexo, data_nascimento, faixa_etaria_manual, email, telefone, papel_casamento, observacoes, status_rsvp, grupos(nome, grupo_pai:grupo_pai_id(nome)), convites!convite_id(nome)',
      )
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)

    // Os quatro recortes são os mesmos de `index.get.ts`, aplicados do mesmo
    // jeito — filtro que existisse só num dos dois faria o CSV descrever uma
    // lista diferente da que a tela anuncia.
    if (ageGroup?.length) {
      query = query.or(
        ageGroup.map((faixa) => buildAgeGroupFilter(faixa, contextoFaixas)).join(','),
      )
    }
    if (search) {
      query = query.ilike('nome_completo', `%${search}%`)
    }
    if (gruposDoRecorte?.length) {
      query = query.in('grupo_id', gruposDoRecorte)
    }
    if (statusRsvp?.length) {
      query = query.in('status_rsvp', statusRsvp)
    }
    query = query.eq('em_consideracao', emConsideracao === true)

    const { data, error } = await query
      .order('nome_completo', { ascending: true })
      .range(de, de + TAMANHO_DA_PAGINA - 1)

    if (error) {
      throw badRequestError(error.message)
    }

    const linhas = (data ?? []) as unknown as LinhaComJuncoes[]

    for (const linha of linhas) {
      // `convidados.grupo_id` aponta para a folha, então a coluna "Grupo" do
      // CSV é o pai quando existe um, e a folha vira "Subdivisão". Exportar a
      // folha como grupo faria a reimportação recriar "Tios paternos" no
      // primeiro nível — hierarquia perdida sem nada acusar.
      const grupoPai = linha.grupos?.grupo_pai ?? null
      convidados.push({
        ...linha,
        grupoNome: grupoPai?.nome ?? linha.grupos?.nome ?? null,
        subgrupoNome: grupoPai ? (linha.grupos?.nome ?? null) : null,
        conviteNome: linha.convites?.nome ?? null,
        statusRsvp: linha.status_rsvp,
      })
    }

    if (linhas.length < TAMANHO_DA_PAGINA) break
    if (convidados.length >= MAXIMO_DE_CONVIDADOS_EXPORTADOS) break
  }

  const csv = gerarCsvExportacao(convidados, {
    faixas: contextoFaixas.faixas,
    dataEvento: contextoFaixas.dataEvento,
  })

  // Contagem e quais filtros estavam ativos — nunca nome, e-mail ou telefone
  // de convidado (CLAUDE.md, seção 11: dado pessoal não é logado em texto
  // pleno). `search` entra como booleano pelo mesmo motivo: o termo buscado
  // costuma ser o nome de uma pessoa.
  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.export',
    entityType: 'guest',
    entityId: weddingId,
    metadata: {
      total: convidados.length,
      filtros: {
        comBusca: Boolean(search),
        grupo: groupId?.length ?? 0,
        emConsideracao: emConsideracao === true,
        faixaEtaria: ageGroup ?? null,
        statusRsvp: statusRsvp ?? null,
      },
    },
  })

  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(
    event,
    'content-disposition',
    `attachment; filename="${nomeDoArquivoDaExportacao(new Date())}"`,
  )
  // Lista de convidados é dado pessoal: nunca deve encostar num cache
  // compartilhado no caminho entre o servidor e o navegador do casal.
  setHeader(event, 'cache-control', 'no-store')

  return csv
})
