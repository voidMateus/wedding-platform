import type { Json } from '~/types/database.types'

/**
 * Webhook de entrega do provedor de e-mail — o que aconteceu com a mensagem
 * depois que ela saiu.
 *
 * **A assinatura é a única prova de origem.** Ao contrário do webhook da
 * InfinitePay (que não documenta assinatura, e por isso trata o corpo como
 * mero ponteiro e reverifica tudo servidor-a-servidor), aqui não há nada a
 * reverificar: "este e-mail voltou" só existe na palavra do provedor. Então a
 * assinatura é obrigatória, e sem segredo configurado a rota recusa — um
 * webhook sem prova de origem é um endpoint público que escreve no banco de
 * qualquer casamento.
 *
 * **Nome neutro na URL** (`/api/webhooks/email`, não `/resend`): o endereço
 * fica registrado no painel do provedor e em DNS de ninguém — trocar de
 * provedor não deveria exigir reconfigurar uma URL que já está publicada.
 *
 * Responde 200 mesmo quando não faz nada: evento desconhecido, envio que não é
 * nosso ou linha já registrada não são erros do provedor, e um não-200 vira
 * retentativa agressiva.
 */
export default defineEventHandler(async (event) => {
  const provider = resolveEmailProvider()
  if (!provider) {
    setResponseStatus(event, 503)
    return { ok: false }
  }

  // O corpo CRU, não o objeto: a assinatura é sobre os bytes exatos que o
  // provedor enviou, e um JSON.parse + stringify reordena chaves e reescreve
  // espaços — a assinatura nunca mais bateria.
  const corpoCru = (await readRawBody(event, 'utf8')) ?? ''

  const cabecalhos: Record<string, string> = {}
  for (const [chave, valor] of Object.entries(getRequestHeaders(event))) {
    if (typeof valor === 'string') cabecalhos[chave.toLowerCase()] = valor
  }

  if (!provider.verificarAssinatura(corpoCru, cabecalhos)) {
    console.error('[webhook:email] assinatura inválida ou ausente')
    setResponseStatus(event, 401)
    return { ok: false }
  }

  let corpo: unknown
  try {
    corpo = JSON.parse(corpoCru)
  } catch {
    setResponseStatus(event, 400)
    return { ok: false }
  }

  const evento = provider.interpretarEvento(corpo)
  // Evento que não nos interessa (abertura, clique) devolve null e para aqui —
  // sem linha, sem log de erro: é o provedor mandando o que ele manda.
  if (!evento) return { ok: true, ignorado: true }

  const admin = supabaseAdmin(event)

  // A ponte é o id do provedor, gravado no envio. Sem correspondência, o
  // evento é de uma mensagem que não saiu daqui (ambiente compartilhado, envio
  // de teste no painel do provedor) — nada a registrar.
  const { data: comunicacao, error } = await admin
    .from('comunicacoes')
    .select('id, casamento_id')
    .eq('provedor_mensagem_id', evento.idNoProvedor)
    .maybeSingle()

  if (error) {
    console.error('[webhook:email] falha ao localizar o envio', error.message)
    setResponseStatus(event, 500)
    return { ok: false }
  }

  if (!comunicacao) return { ok: true, ignorado: true }

  const { error: insertError } = await admin.from('eventos_email').insert({
    // O trigger deriva o casamento_id da própria comunicação; mandar aqui é
    // só para o tipo gerado, que exige a coluna não nula.
    casamento_id: comunicacao.casamento_id,
    comunicacao_id: comunicacao.id,
    tipo_evento: evento.tipoEvento,
    ocorrido_em: evento.ocorridoEm,
    metadados: evento.metadados as Json,
  })

  if (insertError) {
    console.error('[webhook:email] falha ao registrar o evento', insertError.message)
    setResponseStatus(event, 500)
    return { ok: false }
  }

  return { ok: true }
})
