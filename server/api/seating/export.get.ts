import { serverSupabaseClient } from '#supabase/server'
import { serializarCsv } from '#shared/utils/csv'
import { rotuloDeValor } from '#shared/utils/campos-convidado'

/**
 * O mapa de mesas em CSV — uma linha por pessoa sentada.
 *
 * Existe porque **a mesa só existe para virar papel no dia**: quem usa o mapa é
 * a cerimonialista, no salão, sem acesso ao painel. Sem uma saída, o módulo
 * inteiro para no navegador do casal.
 *
 * Uma linha por PESSOA, não por mesa: é assim que a planilha é lida no dia
 * ("onde senta a Cléia?"), e é o formato que qualquer ferramenta ordena e
 * filtra. Uma linha por mesa com os nomes numa célula só seria bonita e
 * inútil.
 *
 * Quem ainda não sentou entra no fim, com a mesa em branco — é a pergunta que
 * mais se faz no dia anterior, e omitir essas pessoas faria o arquivo parecer
 * completo estando pela metade.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [mesasResult, convidadosResult, avulsosResult] = await Promise.all([
    client.from('mesas').select('id, nome, capacidade').eq('casamento_id', weddingId).order('nome'),
    client
      .from('convidados_com_status')
      .select('nome_completo, mesa_id, status_rsvp')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .eq('em_consideracao', false)
      .order('nome_completo'),
    client
      .from('acompanhantes_avulsos')
      .select('nome_completo, mesa_id')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .order('nome_completo'),
  ])

  if (mesasResult.error) throw badRequestError(mesasResult.error.message)
  if (convidadosResult.error) throw badRequestError(convidadosResult.error.message)
  if (avulsosResult.error) throw badRequestError(avulsosResult.error.message)

  const mesaPorId = new Map((mesasResult.data ?? []).map((mesa) => [mesa.id, mesa]))

  const pessoas = [
    ...(convidadosResult.data ?? []).map((convidado) => ({
      nome: convidado.nome_completo as string,
      mesaId: convidado.mesa_id,
      // O mesmo rótulo da exportação de convidados — a planilha é lida por
      // gente, e dois arquivos do mesmo sistema não podem chamar o mesmo
      // estado de dois jeitos.
      rsvp: rotuloDeValor('status_rsvp', convidado.status_rsvp),
      tipo: 'Convidado',
    })),
    ...(avulsosResult.data ?? []).map((avulso) => ({
      nome: avulso.nome_completo,
      mesaId: avulso.mesa_id,
      // O avulso não tem resposta própria: ele só existe porque alguém já
      // confirmou por ele.
      rsvp: 'Confirmado pelo convite',
      tipo: 'Acompanhante',
    })),
  ]

  // Ordena por mesa (na ordem em que as mesas aparecem) e, dentro dela, por
  // nome. Quem não sentou vai para o fim — `~` perde de qualquer nome de mesa
  // na comparação, e é isso que o mantém no rodapé sem um segundo laço.
  const ordenadas = [...pessoas].sort((a, b) => {
    const mesaA = a.mesaId ? (mesaPorId.get(a.mesaId)?.nome ?? '~') : '~'
    const mesaB = b.mesaId ? (mesaPorId.get(b.mesaId)?.nome ?? '~') : '~'
    if (mesaA !== mesaB) return mesaA.localeCompare(mesaB, 'pt-BR')
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  const linhas = [
    ['Mesa', 'Lugares', 'Pessoa', 'Tipo', 'RSVP'],
    ...ordenadas.map((pessoa) => {
      const mesa = pessoa.mesaId ? mesaPorId.get(pessoa.mesaId) : null
      return [
        mesa?.nome ?? 'Sem mesa',
        mesa ? String(mesa.capacidade) : '',
        pessoa.nome,
        pessoa.tipo,
        pessoa.rsvp,
      ]
    }),
  ]

  await recordAuditLog(event, weddingId, memberId, {
    action: 'seating.export',
    entityType: 'wedding',
    entityId: weddingId,
    // Sem nome de convidado — só o tamanho do que saiu.
    metadata: { pessoas: ordenadas.length, mesas: (mesasResult.data ?? []).length },
  })

  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="${nomeDoArquivo(new Date())}"`)
  // Mapa de mesas é dado pessoal (quem senta com quem): nunca deve encostar num
  // cache compartilhado entre o servidor e o navegador do casal.
  setHeader(event, 'cache-control', 'no-store')

  return serializarCsv(linhas)
})

function nomeDoArquivo(agora: Date): string {
  const data = agora.toISOString().slice(0, 10)
  return `mesas-${data}.csv`
}
