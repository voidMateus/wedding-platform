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
 */
export interface WeddingMembership extends WeddingContext {
  slug: string
  nomesNoivos: string
}
