export type WeddingRole = 'owner' | 'collaborator'

export interface WeddingContext {
  weddingId: string
  role: WeddingRole
}
