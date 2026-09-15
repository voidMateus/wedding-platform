import { serverSupabaseUser } from '#supabase/server'

/**
 * Retorna o estado de sessão do caminho administrativo (CLAUDE.md, seção
 * 14.2): quem está autenticado, todos os casamentos que essa pessoa
 * administra, e se é operador de plataforma (docs/PLANO-SAAS.md, Passo 8 --
 * valor só pra UX do middleware, nunca a fonte de autorização real; isso é
 * sempre requirePlatformOperator() no próprio endpoint de dado). Chamado pelo
 * client logo após o login e no carregamento do app para popular
 * app/stores/auth.store.ts. Não exige autenticação para responder —
 * "ninguém logado" é um estado normal, não um erro.
 *
 * Não devolve mais o casamento ATIVO (docs/fase5-multievento.md 5.2): ele é
 * derivado da rota sobre `memberships`, no client, e a resposta que o
 * servidor daria aqui descreveria o cookie de um instante antes da navegação.
 * Sai junto a query de resolveWeddingContext() que rodava em toda sessão.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    return { user: null, memberships: [], isPlatformOperator: false }
  }

  const [memberships, isPlatformOperator] = await Promise.all([
    listWeddingMemberships(event),
    resolvePlatformOperator(event),
  ])

  return {
    user: { id: user.sub, email: user.email ?? null },
    memberships,
    isPlatformOperator,
  }
})
