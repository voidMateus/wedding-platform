import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { WeddingContext } from '~/types/auth'

/**
 * Resolve o casamento_id/papel do usuário autenticado a partir de
 * membros_casamento (CLAUDE.md, seção 14.2). Usa o client autenticado da
 * própria requisição (não o admin/service_role) — a leitura continua
 * protegida por RLS como defesa em profundidade (CLAUDE.md, seção 4.5),
 * mesmo sendo o próprio server/api quem faz a query.
 *
 * v1 é single-tenant: um usuário só deve ter uma linha em membros_casamento.
 * Se houver mais de uma (preparação multi-tenant, docs/PLANO-SAAS.md Passo
 * 3), a primeira encontrada é usada — não há hoje um seletor de "casamento
 * ativo".
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
    .from('membros_casamento')
    .select('id, casamento_id, papel')
    .eq('usuario_id', user.sub)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Falha ao resolver o contexto do casamento do usuário autenticado.',
    })
  }

  if (!data) {
    return null
  }

  return {
    weddingId: data.casamento_id,
    role: data.papel as WeddingContext['role'],
    memberId: data.id,
  }
}

/**
 * Variante estrita para handlers do caminho administrativo: lança 401 se não
 * há sessão, 403 se a sessão existe mas não está vinculada a nenhum
 * casamento (conta provisionada sem membros_casamento — docs/PLANO-SAAS.md
 * Passo 3).
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
