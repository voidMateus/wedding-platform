export type WeddingRole = 'owner' | 'collaborator'

export interface WeddingContext {
  weddingId: string
  role: WeddingRole
  /** id da própria linha em wedding_members — usado como actor_id em audit_logs. */
  memberId: string
}
