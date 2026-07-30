import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Único ponto de acesso ao client com `service_role key` (CLAUDE.md, seção 28).
 * Por baixo, delega para o client que o módulo @nuxtjs/supabase já monta a
 * partir de `supabase.serviceKey` (nuxt.config.ts) — este wrapper existe só
 * para manter um único lugar de referência caso a implementação mude.
 */
export function supabaseAdmin(event: H3Event) {
  return serverSupabaseServiceRole(event)
}
