import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { WeddingContext, WeddingMembership } from '~/types/auth'

/**
 * Cookie que guarda o slug do casamento "ativo" na sessão administrativa
 * (docs/PLANO-SAAS.md, Passo 3) — setado por app/middleware/auth.global.ts
 * ao navegar em /admin/{slug}/**. Nunca é a fonte de autorização por si só:
 * resolveWeddingContext sempre cruza o slug contra as linhas reais de
 * membros_casamento do usuário autenticado antes de usá-lo (CLAUDE.md, seção
 * 4.2 — nunca aceitar identificador de casamento vindo do client sem validar
 * contra o JWT). Um valor que não corresponde a nenhuma membership real do
 * usuário é simplesmente ignorado, nunca concede acesso a outro casamento.
 */
const ACTIVE_WEDDING_COOKIE = 'casamento_ativo'

function toWeddingContext(row: { id: string; casamento_id: string; papel: string }): WeddingContext {
  return { weddingId: row.casamento_id, role: row.papel as WeddingContext['role'], memberId: row.id }
}

/**
 * Resolve o casamento_id/papel "ativo" do usuário autenticado a partir de
 * membros_casamento (CLAUDE.md, seção 14.2). Usa o client autenticado da
 * própria requisição (não o admin/service_role) — a leitura continua
 * protegida por RLS como defesa em profundidade (CLAUDE.md, seção 4.5),
 * mesmo sendo o próprio server/api quem faz a query.
 *
 * Compatível com todo chamador existente sem nenhuma mudança: com exatamente
 * uma membership (o caso comum hoje, v1 é single-tenant na prática), essa é
 * sempre a resolvida, igual ao comportamento antigo. Só quando o usuário
 * administra mais de um casamento (docs/PLANO-SAAS.md, Passo 3) o cookie
 * `casamento_ativo` decide qual — ausente ou inválido, cai na primeira
 * membership encontrada (nunca falha silenciosamente pra "nenhum acesso").
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
  const { data: memberships, error } = await client
    .from('membros_casamento')
    .select('id, casamento_id, papel')
    .eq('usuario_id', user.sub)

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Falha ao resolver o contexto do casamento do usuário autenticado.',
    })
  }

  if (!memberships || memberships.length === 0) {
    return null
  }

  const first = memberships[0]!
  if (memberships.length === 1) {
    return toWeddingContext(first)
  }

  const activeSlug = getCookie(event, ACTIVE_WEDDING_COOKIE)
  if (activeSlug) {
    const { data: activeWedding } = await client
      .from('casamentos')
      .select('id')
      .eq('slug', activeSlug)
      .maybeSingle()

    const match = activeWedding ? memberships.find((m) => m.casamento_id === activeWedding.id) : undefined
    if (match) {
      return toWeddingContext(match)
    }
  }

  return toWeddingContext(first)
}

/**
 * Lista todos os casamentos que o usuário autenticado administra, com
 * slug/nomes_noivos pra popular a tela de seleção pós-login
 * (docs/PLANO-SAAS.md, Passo 3) — devolve lista vazia sem sessão, nunca
 * lança.
 */
export async function listWeddingMemberships(event: H3Event): Promise<WeddingMembership[]> {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return []
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('membros_casamento')
    .select('id, casamento_id, papel, casamentos (slug, nomes_noivos)')
    .eq('usuario_id', user.sub)

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Falha ao listar os casamentos administrados pelo usuário autenticado.',
    })
  }

  return (data ?? []).map((row) => ({
    weddingId: row.casamento_id,
    role: row.papel as WeddingContext['role'],
    memberId: row.id,
    slug: row.casamentos?.slug ?? '',
    nomesNoivos: row.casamentos?.nomes_noivos ?? '',
  }))
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
