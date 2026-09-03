import type { WeddingRole } from './auth'

/**
 * Shape retornado por GET /api/wedding/members — subconjunto de
 * membros_casamento (sem casamento_id, redundante no contexto de "membros do
 * casamento ativo") enriquecido com o e-mail de auth.users (docs/PLANO-SAAS.md,
 * Passo 3 — só a API de Admin do Supabase Auth resolve isso, nunca RLS).
 */
export interface WeddingMemberEntry {
  id: string
  usuario_id: string
  papel: WeddingRole
  created_at: string
  email: string | null
}
