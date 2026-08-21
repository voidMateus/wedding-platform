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
})
