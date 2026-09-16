import type { PapelDeMembro } from '#shared/papeis-de-membro'
import type { StatusCicloVida } from './wedding'

/**
 * Uma linha do painel interno da plataforma (docs/PLANO-SAAS.md, Passo 8) --
 * campos que espelham colunas de `casamentos` 1:1 ficam em português; os
 * dois campos calculados (donoEmails/contagemConvidados) não vêm de uma
 * única linha de tabela, mas seguem o mesmo vocabulário por não haver
 * ganho real em misturar os dois padrões aqui (CLAUDE.md, seção 6).
 */
export interface PlatformWeddingOverview {
  id: string
  slug: string
  nomesNoivos: string
  dataEvento: string
  statusCicloVida: StatusCicloVida
  createdAt: string
  donoEmails: string[]
  contagemConvidados: number
  /**
   * BYTES, não megabytes: a unidade de exibição é decisão da tela
   * (docs/fase5-multievento.md 8.2), como os centímetros da planta de mesas.
   */
  storageBytes: number
  /**
   * Quando o CASAL mexeu no painel pela última vez — derivada da trilha
   * (`ultima_atividade_por_casamento()`), nunca uma coluna a manter
   * sincronizada. Ação de sistema (cron) e de operador (a própria equipe) não
   * contam: as duas acontecem sem o cliente, e fariam um casamento abandonado
   * parecer vivo.
   *
   * `null` significa "nunca houve atividade do casal" — um estado diferente de
   * "faz muito tempo", e a tela os distingue.
   */
  ultimaAtividadeEm: string | null
}

/** O que o topo da tela resume sobre a plataforma inteira. */
export interface PlatformStorageTotals {
  storageBytes: number
}

/** Um membro do casamento, visto pela ficha do painel interno. */
export interface PlatformWeddingMember {
  id: string
  /** O e-mail, ou o uuid quando a conta de auth já não existe. */
  email: string
  papel: PapelDeMembro
  desde: string
}

/** Uma linha recente da trilha daquele casamento. */
export interface PlatformAuditEntry {
  id: string
  acao: string
  tipoAutor: 'membro' | 'sistema' | 'operador'
  tipoEntidade: string
  createdAt: string
}

/**
 * A ficha de um casamento (docs/fase5-multievento.md 6.6) — o que a listagem
 * mostra, mais o que só faz sentido dentro de um evento: quem tem acesso, o
 * que já saiu daqui e o que aconteceu nele.
 */
export interface PlatformWeddingDetail {
  id: string
  slug: string
  nomesNoivos: string
  dataEvento: string
  statusCicloVida: StatusCicloVida
  createdAt: string
  contagemConvidados: number
  storageBytes: number
  /**
   * Convites que JÁ SAÍRAM. É o número que decide se trocar o slug quebra
   * alguma coisa: o link do convidado é `/{slug}/rsvp/{código}`.
   */
  convitesEnviados: number
  /** Credenciais de acesso ainda válidas — QR impresso é uma delas. */
  credenciaisAtivas: number
  membros: PlatformWeddingMember[]
  trilha: PlatformAuditEntry[]
  /**
   * Até quando o acesso de suporte DESTE operador vale, ou null quando ele não
   * tem um aberto (docs/fase5-multievento.md 6.7).
   */
  acessoDeSuporteAte: string | null
  /** True quando o operador é membro de verdade — aí não precisa de suporte. */
  membroDeVerdade: boolean
}
