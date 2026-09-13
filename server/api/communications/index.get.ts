import { serverSupabaseClient } from '#supabase/server'
import { normalizarTelefoneE164 } from '#shared/utils/telefone'
import { normalizarEmail } from '#shared/utils/email'
import type { CanalComunicacao, TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import type {
  ComunicacoesResponse,
  EnvioRegistrado,
  EstadoDeEntrega,
  LinhaDeComunicacao,
} from '~/types/comunicacao'
import type { InviteStage } from '~/types/invite'

/**
 * A tela de Comunicações: uma linha por convite, com o último envio de cada
 * tipo e o contato disponível.
 *
 * **Devolve a lista INTEIRA, não uma página** — mesma decisão do Modo Lista, e
 * pelos mesmos dois motivos. O resumo do topo ("19 sem nenhum envio", "12 sem
 * telefone") descreve o casamento e não o recorte; e a fila de envio ("faltam
 * 19, o próximo é este") só existe se o conjunto estiver na mão. Convites são
 * ordem de grandeza menor que convidados — uma família inteira é um convite.
 *
 * Lê da view `convites_com_resumo`: `enviado_em` e `ultimo_contato` são
 * derivados de `comunicacoes` lá dentro (migration 20260913100001), então esta
 * rota nunca recalcula o que o banco já resolve.
 */
export default defineEventHandler(async (event): Promise<ComunicacoesResponse> => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const { data: convites, error: convitesError } = await client
    .from('convites_com_resumo')
    .select('id, nome, convidado_responsavel_id, total_membros, status_operacional, ultimo_contato')
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    // Arquivado fica de fora: arquivar é escopo administrativo ("este convite
    // não faz mais parte do evento"), e um convite fora do evento não entra na
    // conta de quem ainda precisa receber.
    .is('arquivado_em', null)
    .order('nome')

  if (convitesError) throw badRequestError(convitesError.message)

  const ids = (convites ?? [])
    .map((convite) => convite.id)
    .filter((id): id is string => Boolean(id))

  const [{ data: envios, error: enviosError }, { data: responsaveis, error: responsaveisError }] =
    await Promise.all([
      ids.length
        ? client
            .from('comunicacoes')
            // `eventos_email` embutido: o estado de entrega é derivado do
            // evento mais recente, e uma segunda consulta por envio faria N+1
            // numa tela que carrega a lista inteira.
            .select(
              'id, convite_id, tipo, canal, enviado_em, eventos_email(tipo_evento, ocorrido_em)',
            )
            .eq('casamento_id', weddingId)
            .in('convite_id', ids)
            .order('enviado_em', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      client
        .from('convidados')
        .select('id, nome_completo, telefone, email')
        .eq('casamento_id', weddingId)
        .is('excluido_em', null),
    ])

  if (enviosError) throw badRequestError(enviosError.message)
  if (responsaveisError) throw badRequestError(responsaveisError.message)

  const pessoaPorId = new Map((responsaveis ?? []).map((pessoa) => [pessoa.id, pessoa]))

  /**
   * O envio mais recente de cada (convite, tipo). A consulta já vem ordenada do
   * mais novo para o mais antigo, então o primeiro a chegar em cada chave é o
   * que vale — e é por isso que a ordenação está no banco e não aqui.
   */
  const ultimoPorConviteETipo = new Map<string, (typeof envios)[number]>()
  for (const envio of envios ?? []) {
    const chave = `${envio.convite_id}:${envio.tipo}`
    if (!ultimoPorConviteETipo.has(chave)) ultimoPorConviteETipo.set(chave, envio)
  }

  const linhas: LinhaDeComunicacao[] = (convites ?? []).map((convite) => {
    const responsavel = convite.convidado_responsavel_id
      ? (pessoaPorId.get(convite.convidado_responsavel_id) ?? null)
      : null
    const telefone = normalizarTelefoneE164(responsavel?.telefone)
    const email = normalizarEmail(responsavel?.email)

    function envioDe(tipo: TipoComunicacao): EnvioRegistrado | null {
      const registro = ultimoPorConviteETipo.get(`${convite.id}:${tipo}`)
      if (!registro) return null
      return {
        id: registro.id,
        canal: registro.canal as CanalComunicacao,
        enviadoEm: registro.enviado_em,
        entrega: registro.canal === 'email' ? estadoDeEntrega(registro.eventos_email) : null,
      }
    }

    return {
      id: convite.id as string,
      nome: convite.nome as string,
      totalMembros: convite.total_membros ?? 0,
      estagio: convite.status_operacional as InviteStage,
      ultimoContato: convite.ultimo_contato,
      responsavel: responsavel
        ? { id: responsavel.id, nomeCompleto: responsavel.nome_completo }
        : null,
      // O número já normalizado, não o que está no cadastro: é ele que o
      // `wa.me` consome, e resolver isso no servidor é o que impede a tela de
      // oferecer "Enviar" para um número que não abre conversa nenhuma.
      telefoneE164: telefone,
      email,
      envios: {
        save_the_date: envioDe('save_the_date'),
        convite: envioDe('convite'),
        lembrete: envioDe('lembrete'),
      },
    }
  })

  return {
    data: linhas,
    resumo: {
      total: linhas.length,
      comConviteEnviado: linhas.filter((linha) => linha.envios.convite).length,
      semNenhumEnvio: linhas.filter((linha) => !linha.ultimoContato).length,
      // Conta só quem NÃO pode receber por WhatsApp — o número que vira o
      // atalho "complete os contatos". Convite sem responsável entra aqui pelo
      // mesmo motivo: não há para quem mandar.
      semTelefone: linhas.filter((linha) => !linha.telefoneE164).length,
      semEmail: linhas.filter((linha) => !linha.email).length,
      // Conta LINHAS com algum envio que voltou, não envios — o que o casal
      // precisa saber é de quantos convites ele tem que cuidar.
      naoEntregues: linhas.filter((linha) =>
        Object.values(linha.envios).some(
          (envio) => envio?.entrega === 'devolvido' || envio?.entrega === 'reclamado',
        ),
      ).length,
    },
  }
})

/**
 * O estado de entrega de um envio: o evento MAIS RECENTE, traduzido.
 *
 * Sem nenhum evento o estado é `enviado` — saiu e ainda não houve notícia.
 * Isso é diferente de "entregue" (que o provedor confirma) e de "falhou", e a
 * distinção importa: a maioria dos envios vive em `enviado` para sempre,
 * porque só entrega confirmada e devolução geram webhook.
 */
function estadoDeEntrega(
  eventos: { tipo_evento: string; ocorrido_em: string }[] | null,
): EstadoDeEntrega {
  if (!eventos?.length) return 'enviado'

  const maisRecente = [...eventos].sort((a, b) => b.ocorrido_em.localeCompare(a.ocorrido_em))[0]
  return (maisRecente?.tipo_evento as EstadoDeEntrega) ?? 'enviado'
}
