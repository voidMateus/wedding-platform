import type { Database } from './database.types'
import type { FatoObservado } from '#shared/planejamento-tarefas'
import type { DestaqueDoPlanejamento, ResumoDoPlanejamento } from '#shared/utils/planejamento'

// Tipos do módulo Planejamento. `Tarefa` espelha a linha de tabela (nunca
// redigitada); o resto é agregado que o endpoint monta para exibição.

export type Tarefa = Database['public']['Tables']['tarefas']['Row']

export interface TarefasResponse {
  data: Tarefa[]
  /** O que o sistema já sabe, e que por isso não vira sugestão. */
  fatos: FatoObservado[]
  dataEvento: string | null
  /** Resolvido no fuso do evento — é ele que define as janelas. */
  hoje: string
}

export interface ResumoPlanejamento extends ResumoDoPlanejamento {
  destaque: DestaqueDoPlanejamento
  hoje: string
}
