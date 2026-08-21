export type WeddingRole = 'owner' | 'collaborator'

export interface WeddingContext {
  weddingId: string
  role: WeddingRole
  /** id da própria linha em membros_casamento — usado como actor_id em trilha_auditoria. */
  memberId: string
}
