import { loginWithMagicLinkSchema, loginWithPasswordSchema } from '#shared/schemas/auth'
import type { LoginWithMagicLinkInput, LoginWithPasswordInput } from '#shared/schemas/auth'

/**
 * Ações de autenticação do caminho administrativo (CLAUDE.md, seção 14.2).
 * Mutações de rede ficam aqui, nunca direto em componente/página
 * (CLAUDE.md, seção 5.1).
 */
export function useAuth() {
  const supabase = useSupabaseClient()
  const authStore = useAuthStore()

  async function signInWithPassword(input: LoginWithPasswordInput): Promise<void> {
    const { email, password } = loginWithPasswordSchema.parse(input)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw error
    }
    // signInWithPassword resolve antes de useSupabaseUser() reagir à mudança
    // de sessão (o cookie é gravado, mas o ref reativo só atualiza em um
    // próximo tick, via onAuthStateChange). Sem esperar isso, um
    // navigateTo('/admin') imediato chega no middleware antes do usuário
    // aparecer, e auth.global.ts manda de volta pro /login.
    await waitForSupabaseUser()
    await authStore.fetchSession()
  }

  /**
   * Para onde o link do e-mail volta.
   *
   * Sem isto, o Supabase mandava a pessoa para o `site_url` do projeto — a raiz
   * do domínio, que é uma página neutra sem nada que troque o `code` por
   * sessão. O link mágico chegava, era clicado, e não logava ninguém (rodada de
   * usabilidade de 20/09/2026, ponto 5).
   *
   * Montado a partir de `window.location.origin` para valer igual em local,
   * preview e produção — cada ambiente tem o seu, e fixar um deles quebraria os
   * outros dois. O endereço precisa estar na allowlist de **Redirect URLs** do
   * projeto Supabase; não basta o código pedir.
   */
  function enderecoDeRetorno(destino = '/admin'): string {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`
  }

  async function signInWithMagicLink(input: LoginWithMagicLinkInput): Promise<void> {
    const { email } = loginWithMagicLinkSchema.parse(input)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: enderecoDeRetorno() },
    })
    if (error) {
      throw error
    }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    authStore.clear()
    await navigateTo('/login')
  }

  /**
   * Troca o `code` do link de e-mail por uma sessão.
   *
   * Espera o usuário reativo aparecer pelo mesmo motivo de
   * `signInWithPassword`: o cookie é gravado antes de `useSupabaseUser()`
   * reagir, e um `navigateTo('/admin')` imediato chegaria ao middleware sem
   * usuário — que devolveria a pessoa para o login logo depois de ela ter
   * entrado com sucesso.
   */
  async function completarAcessoPorLink(code: string): Promise<void> {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      throw error
    }
    await waitForSupabaseUser()
    await authStore.fetchSession()
  }

  return {
    signInWithPassword,
    signInWithMagicLink,
    signOut,
    enderecoDeRetorno,
    completarAcessoPorLink,
  }
}

function waitForSupabaseUser(timeoutMs = 3000): Promise<void> {
  const user = useSupabaseUser()
  if (user.value) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const stop = watch(user, (value) => {
      if (value) {
        stop()
        clearTimeout(timer)
        resolve()
      }
    })
    const timer = setTimeout(() => {
      stop()
      resolve()
    }, timeoutMs)
  })
}
