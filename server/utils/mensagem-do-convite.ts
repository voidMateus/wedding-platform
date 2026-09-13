import { modeloDoTipo, renderizarModelo } from '#shared/utils/modelo-comunicacao'
import type { ModelosComunicacaoInput } from '#shared/schemas/comunicacoes'
import type { TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import { formatDatePtBR } from '#shared/utils/format-date'
import { normalizarEmail } from '#shared/utils/email'
import { normalizarTelefoneE164 } from '#shared/utils/telefone'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * A mensagem de um convite, pronta para sair por qualquer canal.
 *
 * Vive em `server/utils/` e não dentro do endpoint porque TRÊS caminhos
 * precisam exatamente dela: o WhatsApp assistido (`/api/communications/message`),
 * o envio por e-mail (`/api/communications/email`) e o cron de lembretes, que
 * não tem requisição HTTP nenhuma. Duplicada, a resolução das variáveis
 * divergiria no caso que ninguém testa — o casamento sem local cadastrado, o
 * convite sem responsável.
 */

export interface DestinatarioDoConvite {
  /** Nulo quando o convite não tem responsável definido. */
  id: string | null
  /** Como a mensagem chama a pessoa: apelido, ou o primeiro nome. */
  nome: string
  nomeCompleto: string | null
  telefoneE164: string | null
  email: string | null
}

export interface MensagemDoConvite {
  texto: string
  /** Link do convite, ou nulo quando a credencial não pôde ser reexibida. */
  link: string | null
  destinatario: DestinatarioDoConvite | null
  nomesNoivos: string
  slug: string
}

/**
 * Os dados do CASAMENTO que a mensagem usa — iguais para todos os convites
 * dele.
 *
 * Separado para poder ser carregado uma vez e reaproveitado: o cron de
 * lembretes monta oitenta mensagens do mesmo casamento, e sem isto refaria a
 * consulta do casamento e a da primeira etapa oitenta vezes cada.
 */
export interface ContextoDoCasamento {
  slug: string
  nomesNoivos: string
  dataEvento: string
  prazoRsvp: string | null
  modelos: ModelosComunicacaoInput
  /** Nome (ou endereço) da primeira etapa do cronograma. */
  local: string
}

export async function carregarContextoDoCasamento(
  client: SupabaseClient<Database>,
  weddingId: string,
): Promise<ContextoDoCasamento> {
  const [casamentoResult, etapaResult] = await Promise.all([
    client
      .from('casamentos')
      .select('slug, nomes_noivos, data_evento, prazo_rsvp, config_comunicacao')
      .eq('id', weddingId)
      .single(),
    // O "local" da mensagem é o da PRIMEIRA etapa do cronograma — a cerimônia,
    // na ordem que o casal definiu. Um casamento com cerimônia e festa em
    // lugares diferentes tem os dois no site; a mensagem curta cita o primeiro,
    // que é para onde o convidado vai antes.
    client
      .from('etapas_evento')
      .select('nome_local, endereco_local')
      .eq('casamento_id', weddingId)
      .order('ordem_exibicao')
      .limit(1)
      .maybeSingle(),
  ])

  if (casamentoResult.error) throw badRequestError(casamentoResult.error.message)

  const casamento = casamentoResult.data
  const etapa = etapaResult.data

  return {
    slug: casamento.slug,
    nomesNoivos: casamento.nomes_noivos,
    dataEvento: casamento.data_evento,
    prazoRsvp: casamento.prazo_rsvp,
    modelos: (casamento.config_comunicacao ?? {}) as ModelosComunicacaoInput,
    local: etapa?.nome_local || etapa?.endereco_local || '',
  }
}

export interface ParametrosDaMensagem {
  client: SupabaseClient<Database>
  weddingId: string
  conviteId: string
  tipo: TipoComunicacao
  /** Origem absoluta do site, para montar o link do convite. */
  origin: string
  /** Já carregado (envio em lote), ou buscado aqui quando ausente. */
  contexto?: ContextoDoCasamento
  /**
   * Chamado só quando uma credencial NOVA foi criada. É por aqui que o
   * caminho autenticado registra a auditoria — o cron não tem ator humano a
   * quem atribuir, e por isso não passa nada.
   */
  aoGerarCredencial?: (credencialId: string) => Promise<void>
}

export async function montarMensagemDoConvite(
  params: ParametrosDaMensagem,
): Promise<MensagemDoConvite> {
  const { client, weddingId, conviteId, tipo, origin } = params

  const [conviteResult, casamento] = await Promise.all([
    client
      .from('convites')
      .select('id, nome, convidado_responsavel_id')
      .eq('id', conviteId)
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .maybeSingle(),
    params.contexto ?? carregarContextoDoCasamento(client, weddingId),
  ])

  if (conviteResult.error) throw badRequestError(conviteResult.error.message)
  if (!conviteResult.data) throw notFoundError('Convite não encontrado.')

  const convite = conviteResult.data

  const responsavel = convite.convidado_responsavel_id
    ? await client
        .from('convidados')
        .select('id, nome_completo, apelido, telefone, email')
        .eq('id', convite.convidado_responsavel_id)
        .maybeSingle()
        .then((r) => r.data)
    : null

  const code = await resolverCodigoDeAcesso(params)
  const link = code ? `${origin}/${casamento.slug}/rsvp/${code}` : null

  const texto = renderizarModelo(modeloDoTipo(casamento.modelos, tipo), {
    // Apelido na frente do nome: é como o casal chama a pessoa, e a mensagem é
    // pessoal. Só o PRIMEIRO nome — "Oi, Maria Fernanda Albuquerque!" soa como
    // cobrança de banco.
    nome: responsavel?.apelido || primeiroNome(responsavel?.nome_completo) || convite.nome,
    casal: casamento.nomesNoivos,
    data: formatDatePtBR(casamento.dataEvento),
    local: casamento.local,
    prazo: casamento.prazoRsvp ? formatDatePtBR(casamento.prazoRsvp) : '',
    link: link ?? '',
  })

  return {
    texto,
    link,
    nomesNoivos: casamento.nomesNoivos,
    slug: casamento.slug,
    destinatario: responsavel
      ? {
          id: responsavel.id,
          nome: responsavel.apelido || primeiroNome(responsavel.nome_completo) || convite.nome,
          nomeCompleto: responsavel.nome_completo,
          telefoneE164: normalizarTelefoneE164(responsavel.telefone),
          email: normalizarEmail(responsavel.email),
        }
      : null,
  }
}

function primeiroNome(nomeCompleto: string | null | undefined): string {
  return (nomeCompleto ?? '').trim().split(/\s+/)[0] ?? ''
}

/**
 * O código do convite: o que já existe, ou um novo quando não existe nenhum.
 *
 * Gerar aqui é seguro justamente porque só acontece na AUSÊNCIA de credencial
 * ativa — nunca substitui uma. Sem isto, "enviar convite" falharia em todo
 * convite que o casal ainda não tivesse aberto uma vez, que é o caso de todos
 * eles no dia em que ele decide começar a mandar.
 *
 * O que ela **nunca** faz é ROTACIONAR uma credencial existente: isso
 * invalidaria o link e o QR já compartilhados (a regra que
 * `guest-access-tokens/index.post.ts` protege).
 */
async function resolverCodigoDeAcesso(params: ParametrosDaMensagem): Promise<string | null> {
  const { client, weddingId, conviteId } = params

  const { data: existente, error } = await client
    .from('credenciais_acesso_convite')
    .select('id, codigo_cifrado')
    .eq('casamento_id', weddingId)
    .eq('convite_id', conviteId)
    .is('revogado_em', null)
    .maybeSingle()

  if (error) throw badRequestError(error.message)

  if (existente) {
    if (!existente.codigo_cifrado) return null
    try {
      return decryptAccessCode(existente.codigo_cifrado)
    } catch {
      // Chave rotacionada ou ausente: o link do convidado continua válido, só
      // a reexibição é impossível. Gerar um novo aqui invalidaria um QR que
      // pode estar impresso — a tela é que oferece essa decisão ao casal.
      console.error(
        '[communications] falha ao decifrar codigo_cifrado — ACCESS_CODE_ENCRYPTION_KEY ausente ou rotacionada.',
      )
      return null
    }
  }

  const code = generateAccessCode()

  // Falha dura, mesmo contrato de `guest-access-tokens/index.post.ts`: sem a
  // chave, a rota recusa gerar em vez de gravar `codigo_cifrado` nulo e seguir.
  // Um fallback silencioso produziria credenciais que nunca poderão ser
  // reexibidas, e o casal só descobriria na hora de reenviar o convite.
  let codigoCifrado: string
  try {
    codigoCifrado = encryptAccessCode(code)
  } catch (cause) {
    console.error(
      '[communications] ACCESS_CODE_ENCRYPTION_KEY ausente ou malformada — geração de link recusada.',
      cause instanceof Error ? cause.message : cause,
    )
    throw createError({
      statusCode: 500,
      statusMessage: 'Configuração de cifra ausente no servidor.',
      message: 'Não foi possível preparar o link agora. A equipe já foi notificada.',
    })
  }

  const { data: criada, error: insertError } = await client
    .from('credenciais_acesso_convite')
    .insert({
      casamento_id: weddingId,
      convite_id: conviteId,
      codigo_hash: hashAccessCode(code),
      codigo_cifrado: codigoCifrado,
    })
    .select('id')
    .single()

  if (insertError) throw badRequestError(insertError.message)

  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: conviteId,
    tipo_evento: 'token.generated',
    metadados: { source: 'communications' },
  })

  await params.aoGerarCredencial?.(criada.id)

  return code
}
