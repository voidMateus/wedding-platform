import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA } from '#shared/utils/faixa-etaria'
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
  groupId: z.string().uuid().optional(),
  ageGroup: z.enum([...FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA]).optional(),
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
  grupos: { nome: string } | null
  convites: { nome: string } | null
  respostas_rsvp: { status_rsvp: string }[] | null
}

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const { search, groupId, ageGroup } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  const contextoFaixas = await loadAgeGroupContext(client, weddingId)

  const convidados: ConvidadoExportavel[] = []

  for (let pagina = 0; ; pagina++) {
    const de = pagina * TAMANHO_DA_PAGINA
    // Junções em vez de consultas separadas por grupo/convite/RSVP: nome do
    // grupo e do convite e status vêm na mesma linha, sem N+1 e sem um
    // segundo teto de 1000 escondido numa tabela auxiliar.
    //
    // `convites!convite_id` é obrigatório, não estilo: existem DUAS relações
    // entre as tabelas (`convidados.convite_id` e o
    // `convites.convidado_responsavel_id` de volta), e sem a dica de coluna o
    // PostgREST recusa a consulta ("more than one relationship was found").
    let query = client
      .from('convidados')
      .select(
        'id, nome_completo, apelido, sexo, data_nascimento, faixa_etaria_manual, email, telefone, papel_casamento, observacoes, grupos(nome), convites!convite_id(nome), respostas_rsvp(status_rsvp)',
      )
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)

    if (ageGroup) {
      query = query.or(buildAgeGroupFilter(ageGroup, contextoFaixas))
    }
    if (search) {
      query = query.ilike('nome_completo', `%${search}%`)
    }
    if (groupId) {
      query = query.eq('grupo_id', groupId)
    }

    const { data, error } = await query
      .order('nome_completo', { ascending: true })
      .range(de, de + TAMANHO_DA_PAGINA - 1)

    if (error) {
      throw badRequestError(error.message)
    }

    const linhas = (data ?? []) as unknown as LinhaComJuncoes[]

    for (const linha of linhas) {
      convidados.push({
        ...linha,
        grupoNome: linha.grupos?.nome ?? null,
        conviteNome: linha.convites?.nome ?? null,
        // `respostas_rsvp` tem no máximo uma linha por convidado (índice único
        // parcial em convidado_id), então a junção nunca traz mais de um item.
        statusRsvp: linha.respostas_rsvp?.[0]?.status_rsvp ?? null,
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
        grupo: Boolean(groupId),
        faixaEtaria: ageGroup ?? null,
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
