import type { WeddingRole } from './auth'

/** Shape retornado por GET /api/wedding/members — subconjunto de membros_casamento (sem casamento_id, redundante no contexto de "membros do casamento ativo"). */
export interface WeddingMemberEntry {
  id: string
  usuario_id: string
  papel: WeddingRole
  created_at: string
}
