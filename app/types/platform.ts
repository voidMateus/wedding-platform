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
}
