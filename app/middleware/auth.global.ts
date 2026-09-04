/**
 * Protege /admin/** e /plataforma/** (CLAUDE.md, seção 5/14.2). Roda em toda
 * navegação; páginas fora desses dois prefixos retornam cedo sem custo.
 * useSupabaseUser() é reativo e populado a partir do cookie de sessão tanto
 * em SSR quanto no client, então a checagem funciona igual em refresh de
 * página e navegação client-side.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/plataforma')) {
    return guardPlataforma(to)
  }

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

  // Cookie de casamento ativo (server/utils/wedding-context.ts): lido aqui
  // para resolver links legados e reescrito no fim com o slug da URL.
  const cookieCasamentoAtivo = useCookie<string | null>('casamento_ativo', {
    sameSite: 'lax',
    path: '/',
  })

  // Links da estrutura plana anterior (/admin/convidados) continuam
  // funcionando depois que o slug do casamento entrou na URL
  // (app/utils/admin-legacy-path.ts).
  const destinoLegado = resolveDestinoAdminLegado(
    to.path,
    authStore.memberships.map((membership) => membership.slug),
    cookieCasamentoAtivo.value ?? null,
  )
  if (destinoLegado) {
    return navigateTo({ path: destinoLegado, query: to.query, hash: to.hash }, { replace: true })
  }

  const slug = typeof to.params.slug === 'string' ? to.params.slug : null

  // /admin puro (sem slug) é a landing pós-login (docs/PLANO-SAAS.md, Passo
  // 3): com exatamente um casamento, pula direto pra ele; com mais de um, a
  // própria página /admin renderiza a tela de seleção; com zero casamentos
  // mas sendo operador de plataforma (Passo 8), pula pra /plataforma —
  // sem isso, login.vue manda todo mundo pra /admin por padrão e uma conta
  // só-operadora bate num estado vazio sem nunca saber que /plataforma
  // existe. Com zero casamentos e não-operador, mostra o estado vazio
  // mesmo (a própria página /admin cobre esse caso).
  if (!slug) {
    if (to.path === '/admin' && authStore.memberships.length === 1) {
      return navigateTo(`/admin/${authStore.memberships[0]!.slug}`, { replace: true })
    }
    if (
      to.path === '/admin' &&
      authStore.memberships.length === 0 &&
      authStore.isPlatformOperator
    ) {
      return navigateTo('/plataforma', { replace: true })
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
  if (cookieCasamentoAtivo.value !== slug) {
    cookieCasamentoAtivo.value = slug
  }
})

/**
 * /plataforma/** (docs/PLANO-SAAS.md, Passo 8) é uma rota raiz sem slug de
 * casamento — a lógica de /admin acima (cookie de casamento ativo,
 * disambiguação por slug) não se aplica, então ganha seu próprio ramo
 * autocontido em vez de compartilhar o `startsWith` com /admin (um `if`
 * genérico deixaria cair na lógica de slug de /admin, que sempre `return`
 * cedo por não achar `to.params.slug` — sem erro nenhum, só sem nunca
 * aplicar a checagem de operador de plataforma).
 */
async function guardPlataforma(to: { fullPath: string }) {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  const authStore = useAuthStore()
  if (!authStore.user) {
    await authStore.fetchSession()
  }

  if (!authStore.isPlatformOperator) {
    return navigateTo('/admin', { replace: true })
  }
}
