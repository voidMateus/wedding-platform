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
}

/** O que o topo da tela resume sobre a plataforma inteira. */
export interface PlatformStorageTotals {
  storageBytes: number
}
