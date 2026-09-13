/**
 * Contrato do provedor de e-mail — a fronteira que mantém "mandar uma
 * mensagem" independente de quem entrega, no mesmo desenho de
 * `places-provider.ts`.
 *
 * A interface existe por dois motivos concretos, nenhum deles especulativo:
 * provedor de e-mail transacional é peça de troca provável (preço por volume,
 * reputação de IP, domínio verificado), e o webhook de entrega é
 * **formato proprietário** — sem esta fronteira, o vocabulário de um provedor
 * (`email.bounced`, cabeçalho `svix-signature`) vazaria para dentro do
 * endpoint e para o banco.
 *
 * Toda operação devolve `{ ok }` em vez de lançar: provedor externo fora do ar
 * não pode virar exceção não tratada no meio de um envio de oitenta convites.
 */

export interface MensagemDeEmail {
  para: string
  /** Nome que aparece no remetente — o casal, nunca a plataforma. */
  remetenteNome: string
  assunto: string
  html: string
  /**
   * A versão em texto puro. Obrigatória, não opcional: e-mail só-HTML é o
   * padrão mais confiável de filtro de spam que existe, e o texto já existe
   * (é o modelo do casal, antes de entrar no layout).
   */
  texto: string
  /**
   * Para onde vai a resposta do convidado. Sem isto, "confirmo, mas vou
   * chegar mais tarde" respondido no e-mail cai num endereço que ninguém lê.
   */
  responderPara?: string | null
}

export interface EnvioAceito {
  /** Vai para `comunicacoes.provedor_mensagem_id` — a ponte com o webhook. */
  idNoProvedor: string
}

/** Nosso vocabulário, nunca o do provedor — espelha `eventos_email.tipo_evento`. */
export type TipoEventoEmail = 'entregue' | 'devolvido' | 'reclamado' | 'adiado'

export interface EventoDeEmail {
  idNoProvedor: string
  tipoEvento: TipoEventoEmail
  ocorridoEm: string
  metadados: Record<string, unknown>
}

export type EmailResult<T> = { ok: true; data: T } | { ok: false; reason: string }

export interface EmailProvider {
  readonly id: string
  enviar(mensagem: MensagemDeEmail): Promise<EmailResult<EnvioAceito>>
  /**
   * O webhook é público por definição (o provedor chama de fora), então a
   * assinatura é a ÚNICA prova de origem — mesma regra do webhook da
   * InfinitePay (CLAUDE.md seção 4.2): corpo de requisição nunca é prova de
   * nada por si só.
   */
  verificarAssinatura(corpoCru: string, cabecalhos: Record<string, string>): boolean
  /** Traduz o corpo do provedor para o nosso vocabulário. `null` = evento que não nos interessa. */
  interpretarEvento(corpo: unknown): EventoDeEmail | null
}

/**
 * O provedor configurado, ou `null` quando não há credencial no ambiente.
 *
 * Null não é erro de programação — é o estado normal de um ambiente sem
 * domínio de envio verificado (todo o desenvolvimento local, por exemplo). Sem
 * provedor, o canal e-mail simplesmente não existe na tela (`emailEnabled` no
 * runtimeConfig público) e o cron de lembretes não roda; o WhatsApp assistido
 * e o registro manual continuam inteiros, como sempre foram.
 *
 * `emailRemetente` faz parte da condição: uma chave de API sem endereço de
 * remetente verificado não manda nada, e descobrir isso no primeiro envio
 * seria descobrir tarde.
 */
export function resolveEmailProvider(): EmailProvider | null {
  const config = useRuntimeConfig()
  if (!config.resendApiKey || !config.emailRemetente) return null
  return createResendProvider({
    apiKey: config.resendApiKey,
    remetente: config.emailRemetente,
    webhookSecret: config.resendWebhookSecret || null,
  })
}
