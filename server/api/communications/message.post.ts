import { serverSupabaseClient } from '#supabase/server'
import { comunicacaoMensagemSchema } from '#shared/schemas/comunicacoes'
import { modeloDoTipo, renderizarModelo } from '#shared/utils/modelo-comunicacao'
import type { ModelosComunicacaoInput } from '#shared/schemas/comunicacoes'
import { formatDatePtBR } from '#shared/utils/format-date'
import { montarLinkWhatsApp, normalizarTelefoneE164 } from '#shared/utils/telefone'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MensagemPronta } from '~/types/comunicacao'
import type { Database } from '~/types/database.types'

/**
 * A mensagem pronta de um convite: texto com as variáveis resolvidas, link do
 * convite e o `wa.me` do responsável.
 *
 * **POST, e não GET, porque ESCREVE**: gera a credencial de acesso quando o
 * convite ainda não tem uma. O link é o ponto do envio — mandar o casal passar
 * antes pela tela do convite para "gerar o link" seria um pedágio inútil no
 * meio de uma tarefa que se repete oitenta vezes. Rota que escreve não é
 * leitura, por mais que pareça.
 *
 * O que ela **nunca** faz é ROTACIONAR uma credencial existente: isso
 * invalidaria o link e o QR já compartilhados (a regra que
 * `guest-access-tokens/index.post.ts` protege). Credencial que existe e não
 * pode ser decifrada (chave rotacionada) devolve `link: null`, e a tela oferece
 * gerar um novo — a mesma degradação do painel do convite.
 */
export default defineEventHandler(async (event): Promise<MensagemPronta> => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, comunicacaoMensagemSchema)

  const client = await serverSupabaseClient(event)

  const [conviteResult, casamentoResult, etapaResult] = await Promise.all([
    client
      .from('convites')
      .select('id, nome, convidado_responsavel_id')
      .eq('id', input.conviteId)
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .maybeSingle(),
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

  if (conviteResult.error) throw badRequestError(conviteResult.error.message)
  if (!conviteResult.data) throw notFoundError('Convite não encontrado.')
  if (casamentoResult.error) throw badRequestError(casamentoResult.error.message)

  const convite = conviteResult.data
  const casamento = casamentoResult.data
  const etapa = etapaResult.data

  const responsavel = convite.convidado_responsavel_id
    ? await client
        .from('convidados')
        .select('id, nome_completo, apelido, telefone')
        .eq('id', convite.convidado_responsavel_id)
        .maybeSingle()
        .then((r) => r.data)
    : null

  const code = await resolverCodigoDeAcesso(event, client, weddingId, input.conviteId, memberId)

  const origin = getRequestURL(event).origin
  const link = code ? `${origin}/${casamento.slug}/rsvp/${code}` : null

  const modelos = (casamento.config_comunicacao ?? {}) as ModelosComunicacaoInput
  const texto = renderizarModelo(modeloDoTipo(modelos, input.tipo), {
    // Apelido na frente do nome: é como o casal chama a pessoa, e a mensagem é
    // pessoal. Só o PRIMEIRO nome — "Oi, Maria Fernanda Albuquerque!" soa como
    // cobrança de banco.
    nome: responsavel?.apelido || primeiroNome(responsavel?.nome_completo) || convite.nome,
    casal: casamento.nomes_noivos,
    data: formatDatePtBR(casamento.data_evento),
    local: etapa?.nome_local || etapa?.endereco_local || '',
    prazo: casamento.prazo_rsvp ? formatDatePtBR(casamento.prazo_rsvp) : '',
    link: link ?? '',
  })

  const telefoneE164 = normalizarTelefoneE164(responsavel?.telefone)

  return {
    conviteId: convite.id,
    tipo: input.tipo,
    texto,
    link,
    telefoneE164,
    linkWhatsApp: montarLinkWhatsApp(responsavel?.telefone, texto),
  }
})

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
 */
async function resolverCodigoDeAcesso(
  event: Parameters<typeof recordAuditLog>[0],
  client: SupabaseClient<Database>,
  weddingId: string,
  conviteId: string,
  memberId: string,
): Promise<string | null> {
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

  // A geração entra na auditoria como qualquer outra: `origem` distingue o
  // link nascido aqui do gerado à mão na tela do convite.
  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_access_token.generate',
    entityType: 'guest_access_token',
    entityId: criada.id,
    metadata: { inviteId: conviteId, origem: 'communications' },
  })

  return code
}
