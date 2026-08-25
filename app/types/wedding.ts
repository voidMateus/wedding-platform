import type { Database } from './database.types'

export type Wedding = Database['public']['Tables']['casamentos']['Row']

/** Espelha o CHECK de `casamentos.status_ciclo_vida` (CLAUDE.md, seção 8) -- nunca `enum` do TypeScript. */
export type StatusCicloVida = 'rascunho' | 'publicado' | 'arquivado'
