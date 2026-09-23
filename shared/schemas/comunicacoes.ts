import { z } from 'zod'
import { CANAIS_COMUNICACAO, TIPOS_COMUNICACAO } from '#shared/utils/modelo-comunicacao'

/**
 * Registro de um envio. Compartilhado entre client e server (CLAUDE.md, seção
 * 8): o servidor revalida com o mesmo schema, porque o client nunca é fonte de
 * verdade.
 *
 * `enviadoEm` é opcional e **nunca no futuro**.
 *
 * Ele não existia, e o motivo escrito aqui era que uma data do client abriria a
 * porta para um envio datado no futuro entrar no funil como se já tivesse
 * acontecido. O risco era real e continua barrado — mas ele era só do FUTURO, e
 * barrar o passado junto cobrava um preço que ninguém tinha pedido: o convite
 * entregue na mão no domingo, registrado na segunda, entrava no funil com a
 * data errada, e "quanto tempo faz que mandei" — que é o dado de apoio do
 * estágio "enviado" — passava a mentir (rodada de usabilidade de 20/09/2026,
 * ponto 24).
 *
 * Ausente segue significando "agora", que é o caso normal: quem manda pelo
 * WhatsApp na hora não preenche data nenhuma.
 */
export const comunicacaoRegistroSchema = z.object({
  conviteId: z.string().uuid(),
  tipo: z.enum(TIPOS_COMUNICACAO),
  canal: z.enum(CANAIS_COMUNICACAO),
  /**
   * Destinatário, quando o envio foi para uma pessoa (o WhatsApp vai para um
   * número). Nulo no convite entregue em mãos à família inteira.
   */
  convidadoId: z.string().uuid().nullish(),
  /**
   * Quando o envio aconteceu. Ausente = agora.
   *
   * A margem de um minuto existe porque o relógio do navegador e o do servidor
   * não são o mesmo: sem ela, "agora" digitado na tela chegaria ao servidor
   * alguns milissegundos no futuro e seria recusado — um erro que ninguém
   * conseguiria interpretar.
   */
  enviadoEm: z
    .string()
    .datetime({ offset: true })
    .refine((valor) => new Date(valor).getTime() <= Date.now() + 60_000, {
      message: 'A data do envio não pode estar no futuro.',
    })
    .optional(),
})

export type ComunicacaoRegistroInput = z.infer<typeof comunicacaoRegistroSchema>

/**
 * O que a tela pede para montar uma mensagem: o texto já com as variáveis
 * resolvidas, o link do convite e o telefone de quem recebe.
 *
 * É POST, e não GET, porque **escreve**: gera a credencial de acesso quando o
 * convite ainda não tem uma (o link é o ponto do envio, e mandar o casal
 * passar antes pela tela do convite seria um pedágio inútil). Rota que escreve
 * não é leitura, por mais que pareça.
 */
export const comunicacaoMensagemSchema = z.object({
  conviteId: z.string().uuid(),
  tipo: z.enum(TIPOS_COMUNICACAO),
})

export type ComunicacaoMensagemInput = z.infer<typeof comunicacaoMensagemSchema>

/**
 * Os modelos do casal, um por tipo.
 *
 * Todos opcionais: texto ausente cai no padrão da plataforma
 * (`modeloDoTipo`), que é conteúdo de verdade e não placeholder. String vazia
 * é aceita e significa a mesma coisa que ausente — "voltar ao padrão" é apagar
 * o campo, e obrigar um `null` explícito faria a tela ter que distinguir dois
 * estados que o casal vê como um só.
 */
const textoDeModelo = z.string().trim().max(2000).optional()

export const modelosComunicacaoSchema = z.object({
  save_the_date: textoDeModelo,
  convite: textoDeModelo,
  lembrete: textoDeModelo,
})

export type ModelosComunicacaoInput = z.infer<typeof modelosComunicacaoSchema>
