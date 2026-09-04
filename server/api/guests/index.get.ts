import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const querySchema = paginationQuerySchema(25).extend({
  search: z.string().trim().max(200).optional(),
  groupId: z.string().uuid().optional(),
  unassigned: z.coerce.boolean().optional(),
  withoutParty: z.coerce.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const {
    page = 1,
    pageSize = 25,
    search,
    groupId,
    unassigned,
    withoutParty,
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

  const [pageResult, confirmedResult] = await Promise.all([
    query.order('nome_completo', { ascending: true }).range(from, to),
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
