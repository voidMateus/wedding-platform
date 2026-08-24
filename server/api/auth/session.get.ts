import { serverSupabaseUser } from '#supabase/server'

/**
 * Retorna o estado de sessão do caminho administrativo (CLAUDE.md, seção
 * 14.2): quem está autenticado e a que wedding/role essa pessoa pertence.
 * Chamado pelo client logo após o login e no carregamento do app para
 * popular app/stores/auth.store.ts. Não exige autenticação para responder —
 * "ninguém logado" é um estado normal, não um erro.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    return { user: null, weddingContext: null, memberships: [] }
  }

  const [weddingContext, memberships] = await Promise.all([
    resolveWeddingContext(event),
    listWeddingMemberships(event),
  ])

  return {
    user: { id: user.sub, email: user.email ?? null },
    weddingContext,
    memberships,
  }
})
