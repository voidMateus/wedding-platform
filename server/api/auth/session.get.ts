import { serverSupabaseUser } from '#supabase/server'

/**
 * Retorna o estado de sessão do caminho administrativo (CLAUDE.md, seção
 * 14.2): quem está autenticado, a que wedding/role essa pessoa pertence, e
 * se é operador de plataforma (docs/PLANO-SAAS.md, Passo 8 -- valor só pra
 * UX do middleware, nunca a fonte de autorização real; isso é sempre
 * requirePlatformOperator() no próprio endpoint de dado). Chamado pelo
 * client logo após o login e no carregamento do app para popular
 * app/stores/auth.store.ts. Não exige autenticação para responder —
 * "ninguém logado" é um estado normal, não um erro.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    return { user: null, weddingContext: null, memberships: [], isPlatformOperator: false }
  }

  const [weddingContext, memberships, isPlatformOperator] = await Promise.all([
    resolveWeddingContext(event),
    listWeddingMemberships(event),
    resolvePlatformOperator(event),
  ])

  return {
    user: { id: user.sub, email: user.email ?? null },
    weddingContext,
    memberships,
    isPlatformOperator,
  }
})
