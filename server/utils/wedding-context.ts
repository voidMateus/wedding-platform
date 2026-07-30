import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { WeddingContext } from '~/types/auth'

/**
 * Resolve o wedding_id/role do usuário autenticado a partir de
 * wedding_members (CLAUDE.md, seção 14.2). Usa o client autenticado da
 * própria requisição (não o admin/service_role) — a leitura continua
 * protegida por RLS como defesa em profundidade (CLAUDE.md, seção 4.5),
 * mesmo sendo o próprio server/api quem faz a query.
 *
 * v1 é single-tenant: um usuário só deve ter uma linha em wedding_members.
 * Se houver mais de uma (preparação multi-tenant, CLAUDE.md seção 33), a
 * primeira encontrada é usada — não há hoje um seletor de "wedding ativo".
 */
export async function resolveWeddingContext(event: H3Event): Promise<WeddingContext | null> {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return null
  }

  const client = await serverSupabaseClient(event)

  // serverSupabaseUser retorna o payload cru do JWT: o id do usuário vem em
  // `sub` (claim padrão), não em `id` (esse é o shape do objeto `User` da
  // API de Admin, um tipo diferente).
  const { data, error } = await client
    .from('wedding_members')
    .select('id, wedding_id, role')
    .eq('user_id', user.sub)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Falha ao resolver o contexto do wedding do usuário autenticado.',
    })
  }

  if (!data) {
    return null
  }

  return {
    weddingId: data.wedding_id,
    role: data.role as WeddingContext['role'],
    memberId: data.id,
  }
}

/**
 * Variante estrita para handlers do caminho administrativo: lança 401 se não
 * há sessão, 403 se a sessão existe mas não está vinculada a nenhum wedding
 * (conta provisionada sem wedding_members — CLAUDE.md, seção 33.2).
 */
export async function requireWeddingContext(event: H3Event): Promise<WeddingContext> {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw unauthorizedError()
  }

  const context = await resolveWeddingContext(event)
  if (!context) {
    throw forbiddenError('Sua conta ainda não está vinculada a nenhum casamento.')
  }

  return context
}
