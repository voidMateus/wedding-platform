import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { comunicacaoMensagemSchema } from '#shared/schemas/comunicacoes'
import { normalizarEmail } from '#shared/utils/email'
import type { EnvioPorEmail } from '~/types/comunicacao'

/**
 * Manda o e-mail e registra o envio no mesmo gesto.
 *
 * **Por que uma rota própria, e não `canal: 'email'` no registro.** Registrar
 * é declarar um fato que já aconteceu por fora; aqui o envio acontece DENTRO
 * da plataforma, e por isso esta rota é a única do módulo que pode falhar por
 * um motivo que não é do casal (provedor fora do ar, domínio não verificado).
 * Separadas, o registro continua sendo o gesto simples que sempre foi.
 *
 * **Ordem: manda primeiro, registra depois.** Se o provedor recusar, não há
 * envio a registrar — o contrário (registrar e depois mandar) deixaria o funil
 * dizendo "enviado" para uma mensagem que nunca saiu, que é exatamente o erro
 * que `convites.enviado_em` cometia. Se o registro falhar depois de o e-mail
 * ter saído, o envio aconteceu e o log fica devendo: é a única ordem em que a
 * inconsistência possível é a inofensiva.
 *
 * O destinatário é o **responsável pelo convite**, o mesmo do WhatsApp: o
 * convite é a unidade de comunicação, e uma pessoa responde por ele.
 */
export default defineEventHandler(async (event): Promise<EnvioPorEmail> => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, comunicacaoMensagemSchema)

  const provider = resolveEmailProvider()
  if (!provider) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Envio por e-mail não configurado.',
      message:
        'O envio por e-mail ainda não está disponível neste ambiente. Use o WhatsApp ou registre o envio por fora.',
    })
  }

  const client = await serverSupabaseClient(event)

  const mensagem = await montarMensagemDoConvite({
    client,
    weddingId,
    conviteId: input.conviteId,
    tipo: input.tipo,
    origin: getRequestURL(event).origin,
    aoGerarCredencial: async (credencialId) => {
      await recordAuditLog(event, weddingId, memberId, {
        action: 'guest_access_token.generate',
        entityType: 'guest_access_token',
        entityId: credencialId,
        metadata: { inviteId: input.conviteId, origem: 'communications' },
      })
    },
  })

  const destinatario = mensagem.destinatario
  if (!destinatario?.email) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Convite sem e-mail.',
      message: 'Este convite não tem um e-mail válido no cadastro de quem responde por ele.',
    })
  }

  const { data: casamento } = await client
    .from('casamentos')
    .select('config_tema')
    .eq('id', weddingId)
    .single()

  const tema = (casamento?.config_tema ?? {}) as { primaryColor?: string }
  const urlDoSite = `${useRuntimeConfig().public.siteUrl || getRequestURL(event).origin}/${mensagem.slug}`

  // Resposta do convidado vai para quem clicou em enviar, não para um
  // no-reply: "confirmo, mas chego mais tarde" respondido no e-mail precisa
  // chegar a uma pessoa. É o e-mail da sessão, nunca um campo do corpo da
  // requisição — endereço de resposta vindo do client é relay aberto.
  const usuario = await serverSupabaseUser(event)

  const enviado = await provider.enviar({
    para: destinatario.email,
    remetenteNome: mensagem.nomesNoivos,
    assunto: assuntoDeEmail(
      mensagem.nomesNoivos,
      input.tipo === 'lembrete' ? 'lembrete' : 'convite',
    ),
    html: montarHtmlDeEmail({
      texto: mensagem.texto,
      nomesNoivos: mensagem.nomesNoivos,
      corPrimaria: tema.primaryColor ?? null,
      urlDoSite,
    }),
    texto: mensagem.texto,
    responderPara: normalizarEmail(usuario?.email),
  })

  if (!enviado.ok) {
    // A causa real vai para o log do servidor (é configuração, e o time
    // precisa dela); o casal recebe uma frase que não o manda depurar DNS.
    console.error('[communications:email] envio recusado pelo provedor —', enviado.reason)
    throw createError({
      statusCode: 502,
      statusMessage: 'Provedor de e-mail recusou o envio.',
      message: 'Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.',
    })
  }

  const { data, error } = await client
    .from('comunicacoes')
    .insert({
      casamento_id: weddingId,
      convite_id: input.conviteId,
      convidado_id: destinatario.id,
      canal: 'email',
      tipo: input.tipo,
      registrado_por: memberId,
      provedor_mensagem_id: enviado.data.idNoProvedor,
    })
    .select('id, tipo, canal, enviado_em')
    .single()

  if (error) throw badRequestError(error.message)

  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: input.conviteId,
    tipo_evento: 'comunicacao.enviada',
    metadados: { tipo: input.tipo, canal: 'email', source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'communication.send_email',
    entityType: 'communication',
    entityId: data.id,
    // Sem o endereço: dado pessoal não vai para log em texto pleno (CLAUDE.md
    // seção 11). O id da mensagem no provedor é o que permite rastrear.
    metadata: {
      inviteId: input.conviteId,
      tipo: input.tipo,
      provedor: provider.id,
      provedorMensagemId: enviado.data.idNoProvedor,
    },
  })

  return {
    id: data.id,
    tipo: input.tipo,
    enviadoEm: data.enviado_em,
    // Devolvido para a tela poder dizer "enviado para a Ana" — o nome, nunca o
    // endereço, que já está no cadastro e não precisa ser repetido num toast.
    destinatario: destinatario.nome,
  }
})
