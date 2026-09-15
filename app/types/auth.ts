import type { WeddingLifecycleStatus } from '~/utils/status-presentation'

export type WeddingRole = 'dono' | 'colaborador'

export interface WeddingContext {
  weddingId: string
  role: WeddingRole
  /** id da própria linha em membros_casamento — usado como actor_id em trilha_auditoria. */
  memberId: string
}

/**
 * Uma linha de membros_casamento enriquecida com dados do casamento, para a
 * tela de seleção pós-login (docs/PLANO-SAAS.md, Passo 3) — a lista completa
 * de casamentos que o usuário administra, não só o "ativo" no momento.
 *
 * Desde a Fase 5 do Hub é também a fonte do casamento ATIVO no client: ele é
 * derivado da rota sobre esta lista (`useActiveMembership()`), nunca guardado
 * — e por isso a lista carrega o que a lista de eventos e o cabeçalho
 * precisam mostrar, sem uma segunda requisição por casamento.
 */
export interface WeddingMembership extends WeddingContext {
  slug: string
  nomesNoivos: string
  dataEvento: string
  statusCicloVida: WeddingLifecycleStatus
}
