/**
 * Protege /admin/** (CLAUDE.md, seção 5/14.2). Roda em toda navegação;
 * páginas fora de /admin retornam cedo sem custo. useSupabaseUser() é
 * reativo e populado a partir do cookie de sessão tanto em SSR quanto no
 * client, então a checagem funciona igual em refresh de página e navegação
 * client-side.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) {
    return
  }

  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  // Popula o cache de casamento_id/papel se ainda não veio do login desta
  // mesma sessão de navegador (ex: refresh direto em /admin/{slug}/algo).
  const authStore = useAuthStore()
  if (!authStore.user) {
    await authStore.fetchSession()
  }

  const slug = typeof to.params.slug === 'string' ? to.params.slug : null

  // /admin puro (sem slug) é a landing pós-login (docs/PLANO-SAAS.md, Passo
  // 3): com exatamente um casamento, pula direto pra ele; com mais de um, a
  // própria página /admin renderiza a tela de seleção; com zero, idem (mostra
  // estado vazio).
  if (!slug) {
    if (to.path === '/admin' && authStore.memberships.length === 1) {
      return navigateTo(`/admin/${authStore.memberships[0]!.slug}`, { replace: true })
    }
    return
  }

  // Slug presente na URL: nunca é a fonte de autorização (isso é sempre
  // resolvido no servidor a partir do JWT, CLAUDE.md seção 4.2) — mas se não
  // corresponde a nenhuma membership real do usuário, manda de volta pro
  // /admin pra resolver de novo, evitando mostrar a UI de um casamento que o
  // usuário não administra.
  if (!authStore.memberships.some((membership) => membership.slug === slug)) {
    return navigateTo('/admin', { replace: true })
  }

  // Sincroniza o cookie de casamento ativo (server/utils/wedding-context.ts)
  // com o slug da URL administrativa — a próxima requisição ao servidor já
  // resolve o contexto certo sem precisar repassar o slug em cada chamada de
  // API.
  const activeWeddingCookie = useCookie('casamento_ativo', { sameSite: 'lax', path: '/' })
  if (activeWeddingCookie.value !== slug) {
    activeWeddingCookie.value = slug
  }
})
