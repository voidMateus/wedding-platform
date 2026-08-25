import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

/**
 * 5º modelo de confiança da plataforma (CLAUDE.md, seção 4.2) -- equipe
 * interna com leitura entre casamentos/contas, diferente de
 * membros_casamento.papel = dono (esse é por casamento). Espelha
 * server/utils/wedding-context.ts: resolve via o client autenticado da
 * própria requisição (RLS: operadores_plataforma_select_proprio), nunca
 * aceita a afirmação "sou operador" vinda do client sem cruzar contra a
 * linha real em operadores_plataforma.
 */
export async function resolvePlatformOperator(event: H3Event): Promise<boolean> {
  const user = await serverSupabaseUser(event)
  if (!user) {
    return false
  }

  const client = await serverSupabaseClient(event)

  // serverSupabaseUser retorna o payload cru do JWT: o id do usuário vem em
  // `sub` (claim padrão), não em `id` (esse é o shape do objeto `User` da
  // API de Admin, um tipo diferente) -- mesmo achado documentado em
  // wedding-context.ts.
  const { data, error } = await client
    .from('operadores_plataforma')
    .select('usuario_id')
    .eq('usuario_id', user.sub)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Falha ao resolver o status de operador de plataforma do usuário autenticado.',
    })
  }

  return data !== null
}

/**
 * Variante estrita para handlers de leitura entre tenants: lança 401 se não
 * há sessão, 403 se a sessão existe mas não é de um operador de plataforma.
 * Endpoints que usam isso em seguida trocam para `supabaseAdmin(event)`
 * (service_role) -- essa checagem em TypeScript É o portão real, RLS não
 * protege nada uma vez que service_role está em jogo (mesmo racional de
 * `context.role !== 'dono'` em server/api/wedding/members/*.ts).
 */
export async function requirePlatformOperator(event: H3Event): Promise<void> {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw unauthorizedError()
  }

  const isOperator = await resolvePlatformOperator(event)
  if (!isOperator) {
    throw forbiddenError('Sua conta não tem acesso ao painel da plataforma.')
  }
}
