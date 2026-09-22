/**
 * Substitui o plugin client do @nuxtjs/supabase (removido em nuxt.config.ts
 * via hooks['modules:done']) — replica a mesma lógica de bootstrap de auth
 * (createBrowserClient + getSession/getClaims + onAuthStateChange), mas só
 * quando a rota atual realmente usa sessão Supabase no client. Achado real
 * de performance (CLAUDE.md §27): o plugin original roda incondicionalmente
 * em toda navegação, inclusive nas páginas públicas, onde nenhum código
 * chama useSupabaseUser()/useSupabaseClient() (só /admin/** e /login usam,
 * CLAUDE.md §14.2) — todo convidado pagava o custo de rede (getSession +
 * getClaims) e o listener de auth à toa. `/plataforma/**` (docs/PLANO-SAAS.md,
 * Passo 8) também precisa de sessão Supabase no client (ex.: sair da conta),
 * mesmo racional de `/admin/**`.
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
  return (
    path.startsWith('/admin') ||
    path.startsWith('/login') ||
    path.startsWith('/plataforma') ||
    // `/auth/**` é a volta dos links de e-mail (convite, acesso, senha). Sem
    // ela aqui, a página de callback não teria client para trocar o `code` por
    // sessão — que foi exatamente o beco do ponto 5 da rodada de usabilidade.
    path.startsWith('/auth')
  )
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
    const { url, key, cookieOptions, cookiePrefix, clientOptions } =
      useRuntimeConfig().public.supabase

    const client = createBrowserClient(url, key, {
      ...clientOptions,
      cookieOptions: {
        ...cookieOptions,
        name: cookiePrefix,
      },
      isSingleton: true,
    })

    nuxtApp.provide('supabase', { client })

    // --- ponte do formato antigo de link de e-mail ---
    //
    // O pedido do link deixou de usar PKCE (`server/utils/link-de-acesso.ts`),
    // e enquanto os templates do Auth não forem trocados nos três ambientes o
    // `{{ .ConfirmationURL }}` devolve a sessão do jeito antigo: os tokens no
    // FRAGMENTO da URL (`#access_token=...&refresh_token=...`).
    //
    // Este client não aceita esse formato, e não avisa. `createBrowserClient`
    // do `@supabase/ssr` fixa `flowType: 'pkce'`, e o `_getSessionFromURL` do
    // auth-js recusa o retorno implicito nesse caso
    // (`case 'implicit': if (this.flowType === 'pkce') throw`) — um erro que
    // `_initialize` engole. O efeito medido em 22/09/2026: o link chegava ao
    // callback, nenhum cookie era gravado, e a tela dizia "este endereço não
    // tem um link de acesso válido" sobre um acesso perfeitamente válido.
    //
    // Guardar a sessão aqui, e não na página de callback, porque a recusa é
    // propriedade DO CLIENT: `/auth/senha` recebe o mesmo formato na
    // recuperação de senha, e qualquer tela futura de `/auth` receberia também.
    //
    const fragmento = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = fragmento.get('access_token')
    const refreshToken = fragmento.get('refresh_token')

    if (accessToken && refreshToken) {
      await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

      // O fragmento sai do endereço — token de acesso no histórico do navegador
      // é credencial guardada onde ninguém a apaga.
      //
      // Depois do mount, e não aqui: este plugin roda com `enforce: 'pre'`, antes
      // de o roteador terminar a navegação inicial, e ele reescreve o endereço a
      // partir do `fullPath` que leu na entrada — devolvendo o fragmento. Em
      // `/auth/callback` isso passava despercebido porque a página navega para
      // outro lugar logo em seguida; em `/auth/senha`, que fica onde está, o
      // token permanecia à vista.
      nuxtApp.hook('app:mounted', () => {
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${window.location.search}`,
        )
      })
    }

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
