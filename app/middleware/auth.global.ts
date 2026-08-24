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
  // mesma sessão de navegador (ex: refresh direto em /admin/algo).
  const authStore = useAuthStore()
  if (!authStore.user) {
    await authStore.fetchSession()
  }

  // Sincroniza o cookie de casamento ativo (server/utils/wedding-context.ts)
  // com o slug da URL administrativa (/admin/{slug}/**, docs/PLANO-SAAS.md
  // Passo 3) — a próxima requisição ao servidor já resolve o contexto certo
  // sem precisar repassar o slug em cada chamada de API. Sem efeito em rotas
  // administrativas sem slug (todo o /admin/** hoje, antes da migração de
  // rotas) — nunca é a fonte de autorização, só o que a URL mostra
  // (CLAUDE.md, seção 4.2).
  const slug = typeof to.params.slug === 'string' ? to.params.slug : null
  if (slug) {
    const activeWeddingCookie = useCookie('casamento_ativo', { sameSite: 'lax', path: '/' })
    if (activeWeddingCookie.value !== slug) {
      activeWeddingCookie.value = slug
    }
  }
})
