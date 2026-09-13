import type { CanalComunicacao, TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import type { InviteStage } from './invite'
import type { Database } from './database.types'

export type Comunicacao = Database['public']['Tables']['comunicacoes']['Row']

/**
 * Um envio, como a tela o lê. Em inglês? Não: `canal` e `enviadoEm` espelham
 * colunas de `comunicacoes` (CLAUDE.md, seção 6 — identificador que espelha
 * vocabulário de banco fica em português).
 */
export interface EnvioRegistrado {
  id: string
  canal: CanalComunicacao
  enviadoEm: string
}

/**
 * A linha da tela de Comunicações: um convite, com o último envio de cada tipo
 * e o contato de quem responde por ele.
 *
 * `envios` tem uma chave por tipo, sempre presente, com `null` no que ainda não
 * aconteceu — e não uma lista de envios. A tela desenha uma coluna por tipo, e
 * uma lista obrigaria cada célula a procurar o seu dentro dela.
 */
export interface LinhaDeComunicacao {
  /**
   * O id do CONVITE. Chama-se `id` porque a linha desta tela é um convite — e
   * porque a `AdminTable` usa `id` como chave de linha, o que é exatamente o
   * que ele significa aqui.
   */
  id: string
  nome: string
  totalMembros: number
  estagio: InviteStage
  /** O envio mais recente de qualquer tipo — "faz quanto tempo que falamos?". */
  ultimoContato: string | null
  responsavel: { id: string; nomeCompleto: string } | null
  /**
   * Telefone do responsável já normalizado para E.164, ou nulo quando não há
   * como falar por WhatsApp. Nulo é informação acionável ("complete os
   * contatos"), nunca erro.
   */
  telefoneE164: string | null
  envios: Record<TipoComunicacao, EnvioRegistrado | null>
}

export interface ComunicacoesResponse {
  data: LinhaDeComunicacao[]
  /**
   * Descreve o casamento inteiro, nunca o recorte da tela — mesma regra dos
   * contadores de Convidados.
   */
  resumo: {
    total: number
    comConviteEnviado: number
    semNenhumEnvio: number
    semTelefone: number
  }
}

/** O que a tela precisa para abrir o WhatsApp de um convite. */
export interface MensagemPronta {
  conviteId: string
  tipo: TipoComunicacao
  /** Texto com as variáveis já resolvidas. */
  texto: string
  /** Link do convite, ou nulo quando a credencial não pôde ser reexibida. */
  link: string | null
  telefoneE164: string | null
  /** `wa.me` pronto, ou nulo quando não há telefone. */
  linkWhatsApp: string | null
}
