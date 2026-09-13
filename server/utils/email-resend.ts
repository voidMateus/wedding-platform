import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  EmailProvider,
  EmailResult,
  EnvioAceito,
  EventoDeEmail,
  MensagemDeEmail,
  TipoEventoEmail,
} from './email-provider'

/**
 * Implementação do contrato de e-mail sobre a Resend.
 *
 * **Via `fetch`, sem o SDK.** A API é um POST com JSON e um Bearer; o pacote
 * `resend` acrescentaria uma dependência de runtime e uma camada de tipos para
 * embrulhar exatamente isso. O mesmo caminho já usado em
 * `server/utils/google-drive.ts` e `infinitepay.ts`.
 *
 * Tudo que é vocabulário da Resend para AQUI: o nome dos eventos, o formato
 * dos cabeçalhos de assinatura, o shape da resposta. Quem chama fala só o
 * vocabulário de `email-provider.ts`.
 */

const ENDPOINT_ENVIO = 'https://api.resend.com/emails'

/**
 * Os eventos que viram linha em `eventos_email`, e só eles.
 *
 * `email.sent` fica de fora de propósito: o envio já É a linha de
 * `comunicacoes`, gravada no mesmo instante com o id devolvido pela API.
 * Registrá-lo de novo criaria duas verdades para um fato só. `email.opened` e
 * `email.clicked` também ficam de fora — são o pixel de rastreamento que a
 * Fase 2 recusou (docs/fase2-convidados.md 2.2), e o sinal de abertura que o
 * produto usa é o acesso real ao convite (`rsvp.first_access`).
 */
const EVENTOS: Record<string, TipoEventoEmail> = {
  'email.delivered': 'entregue',
  'email.bounced': 'devolvido',
  'email.complained': 'reclamado',
  'email.delivery_delayed': 'adiado',
}

interface OpcoesResend {
  apiKey: string
  /** Só o endereço (`convites@dominio.com.br`); o nome vem do casamento. */
  remetente: string
  webhookSecret: string | null
}

export function createResendProvider(opcoes: OpcoesResend): EmailProvider {
  return {
    id: 'resend',

    async enviar(mensagem: MensagemDeEmail): Promise<EmailResult<EnvioAceito>> {
      try {
        const resposta = await fetch(ENDPOINT_ENVIO, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${opcoes.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            from: `${sanitizarNomeDeRemetente(mensagem.remetenteNome)} <${opcoes.remetente}>`,
            to: [mensagem.para],
            subject: mensagem.assunto,
            html: mensagem.html,
            text: mensagem.texto,
            ...(mensagem.responderPara ? { reply_to: mensagem.responderPara } : {}),
          }),
        })

        if (!resposta.ok) {
          // O corpo do erro da Resend traz a causa real ("domain not verified",
          // "invalid to address") — perder isso transformaria toda falha de
          // configuração num "não foi possível enviar" indistinguível.
          const detalhe = await resposta.text().catch(() => '')
          return { ok: false, reason: `resend ${resposta.status}: ${detalhe.slice(0, 300)}` }
        }

        const corpo = (await resposta.json()) as { id?: string }
        if (!corpo.id) return { ok: false, reason: 'resend: resposta sem id de mensagem' }

        return { ok: true, data: { idNoProvedor: corpo.id } }
      } catch (cause) {
        return { ok: false, reason: cause instanceof Error ? cause.message : 'falha de rede' }
      }
    },

    /**
     * Assinatura no padrão Svix, que é o que a Resend usa: HMAC-SHA256 sobre
     * `id.timestamp.corpo`, com o segredo em base64 depois do prefixo
     * `whsec_`. Implementado aqui em vez de trazer o pacote `svix` — são doze
     * linhas de `node:crypto`, e a dependência traria um cliente HTTP inteiro.
     *
     * **Sem segredo configurado, recusa.** Nunca "aceita porque não dá para
     * verificar": um webhook sem prova de origem é um endpoint público que
     * escreve no banco de qualquer casamento.
     */
    verificarAssinatura(corpoCru: string, cabecalhos: Record<string, string>): boolean {
      if (!opcoes.webhookSecret) return false

      const id = cabecalhos['svix-id']
      const timestamp = cabecalhos['svix-timestamp']
      const assinaturas = cabecalhos['svix-signature']
      if (!id || !timestamp || !assinaturas) return false

      // Janela de 5 minutos: sem ela, uma requisição capturada hoje continuaria
      // válida para sempre (replay).
      const idadeSegundos = Math.abs(Date.now() / 1000 - Number(timestamp))
      if (!Number.isFinite(idadeSegundos) || idadeSegundos > 300) return false

      const segredo = Buffer.from(opcoes.webhookSecret.replace(/^whsec_/, ''), 'base64')
      const esperada = createHmac('sha256', segredo)
        .update(`${id}.${timestamp}.${corpoCru}`)
        .digest('base64')

      // O cabeçalho pode trazer várias assinaturas ("v1,abc v1,def") durante
      // uma rotação de segredo — basta uma bater.
      return assinaturas
        .split(' ')
        .map((parte) => parte.split(',')[1] ?? '')
        .some((recebida) => comparaEmTempoConstante(recebida, esperada))
    },

    interpretarEvento(corpo: unknown): EventoDeEmail | null {
      if (!corpo || typeof corpo !== 'object') return null
      const evento = corpo as {
        type?: string
        created_at?: string
        data?: { email_id?: string } & Record<string, unknown>
      }

      const tipoEvento = evento.type ? EVENTOS[evento.type] : undefined
      const idNoProvedor = evento.data?.email_id
      if (!tipoEvento || !idNoProvedor) return null

      return {
        idNoProvedor,
        tipoEvento,
        ocorridoEm: evento.created_at ?? new Date().toISOString(),
        metadados: { type: evento.type, ...(evento.data ?? {}) },
      }
    },
  }
}

/**
 * O nome do casal vai no cabeçalho `From`, onde `"` e quebra de linha são
 * sintaxe. Sem isto, um nome com aspas quebraria o cabeçalho — e injeção de
 * cabeçalho é como se manda e-mail em nome de outra pessoa.
 */
function sanitizarNomeDeRemetente(nome: string): string {
  const limpo = nome.replace(/[\r\n"<>]/g, ' ').trim()
  return limpo ? `"${limpo}"` : '"Casamento"'
}

function comparaEmTempoConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
