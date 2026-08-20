/**
 * Substitui o plugin client do @nuxtjs/supabase (removido em nuxt.config.ts
 * via hooks['modules:done']) — replica a mesma lógica de bootstrap de auth
 * (createBrowserClient + getSession/getClaims + onAuthStateChange), mas só
 * quando a rota atual realmente usa sessão Supabase no client. Achado real
 * de performance (CLAUDE.md §27): o plugin original roda incondicionalmente
 * em toda navegação, inclusive nas páginas públicas, onde nenhum código
 * chama useSupabaseUser()/useSupabaseClient() (só /admin/** e /login usam,
 * CLAUDE.md §14.2) — todo convidado pagava o custo de rede (getSession +
 * getClaims) e o listener de auth à toa.
 *
 * O import de `@supabase/ssr` é dinâmico (`await import(...)`) de propósito
 * — um import estático no topo do arquivo continuaria empacotado no chunk
 * de entrada global (é assim que plugins do Nuxt funcionam), anulando o
 * ganho de bundle mesmo com o early-return abaixo. Só o import dinâmico
 * deixa o Vite fazer code-splitting de verdade: o SDK completo (com
 * GoTrue/Realtime) só é baixado quando a rota realmente precisa dele.
 *
 * `useSsrCookies` é `true` por padrão (nunca sobrescrito em nuxt.config.ts),
 * então só o caminho createBrowserClient (cookies) é implementado aqui —
 * não há uso real do caminho createClient (sem cookies) neste projeto.
 */
function needsSupabaseAuth(path: string): boolean {
  return path.startsWith('/admin') || path.startsWith('/login')
}

export default defineNuxtPlugin({
  name: 'supabase-auth-scoped',
  enforce: 'pre',
  async setup(nuxtApp) {
    const route = useRoute()
    if (!needsSupabaseAuth(route.path)) {
      return
    }

    const { createBrowserClient } = await import('@supabase/ssr')
    const { url, key, cookieOptions, cookiePrefix, clientOptions } = useRuntimeConfig().public.supabase

    const client = createBrowserClient(url, key, {
      ...clientOptions,
      cookieOptions: {
        ...cookieOptions,
        name: cookiePrefix,
      },
      isSingleton: true,
    })

    nuxtApp.provide('supabase', { client })

    const currentSession = useSupabaseSession()
    const currentUser = useSupabaseUser()

    if (!currentSession.value) {
      const { data } = await client.auth.getSession()
      if (data.session) {
        currentSession.value = data.session
        const { data: claimsData } = await client.auth.getClaims()
        currentUser.value = claimsData?.claims ?? null
      }
    }

    nuxtApp.hook('page:start', async () => {
      const { data } = await client.auth.getClaims()
      currentUser.value = data?.claims ?? null
    })

    client.auth.onAuthStateChange((_event, session) => {
      if (JSON.stringify(currentSession.value) !== JSON.stringify(session)) {
        currentSession.value = session
        if (session?.user) {
          client.auth.getClaims().then(({ data }) => {
            currentUser.value = data?.claims ?? null
          })
        } else {
          currentUser.value = null
        }
      }
    })
  },
})
