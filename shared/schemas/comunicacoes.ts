import { z } from 'zod'
import { CANAIS_COMUNICACAO, TIPOS_COMUNICACAO } from '#shared/utils/modelo-comunicacao'

/**
 * Registro de um envio. Compartilhado entre client e server (CLAUDE.md, seção
 * 8): o servidor revalida com o mesmo schema, porque o client nunca é fonte de
 * verdade.
 *
 * `enviadoEm` NÃO entra: quem registra está dizendo "mandei agora", e aceitar
 * uma data do client abriria a porta para um envio datado no futuro entrar no
 * funil como se já tivesse acontecido. O caminho para corrigir um registro
 * errado é apagá-lo (só canal `outro`) e registrar de novo.
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
