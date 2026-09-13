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
  /**
   * O que aconteceu com o e-mail DEPOIS de sair, derivado do evento mais
   * recente em `eventos_email`. Sempre `null` nos canais sem provedor
   * (whatsapp, outro): lá o sistema nunca soube se chegou, e fingir um
   * "entregue" seria inventar a única informação que o canal não dá.
   */
  entrega: EstadoDeEntrega | null
}

/**
 * `enviado` é o estado de quem saiu e ainda não teve notícia — não é "falhou".
 * `devolvido` e `reclamado` são os dois que pedem providência do casal (e são
 * os únicos que a tela destaca).
 */
export type EstadoDeEntrega = 'enviado' | 'entregue' | 'devolvido' | 'reclamado' | 'adiado'

/**
 * Por onde a plataforma manda. É um subconjunto de `CanalComunicacao`: `outro`
 * é como se REGISTRA um envio feito por fora, nunca como se envia — e o
 * seletor da tela só pode oferecer o que ela sabe fazer.
 */
export type CanalDeEnvio = Extract<CanalComunicacao, 'whatsapp' | 'email'>

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
  /**
   * E-mail do responsável já normalizado, ou nulo quando não há como mandar
   * por e-mail. Mesma regra do telefone: nulo é trabalho a fazer, nunca erro.
   */
  email: string | null
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
    /** O par de `semTelefone` para o outro canal — a tela mostra o do canal ativo. */
    semEmail: number
    /** Quantos envios por e-mail voltaram (devolvido/reclamado) e pedem providência. */
    naoEntregues: number
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
  email: string | null
  /** `wa.me` pronto, ou nulo quando não há telefone. */
  linkWhatsApp: string | null
}

/** O resultado de um envio por e-mail — o que o toast da tela precisa dizer. */
export interface EnvioPorEmail {
  id: string
  tipo: TipoComunicacao
  enviadoEm: string
  /** Primeiro nome de quem recebeu, nunca o endereço. */
  destinatario: string
}
