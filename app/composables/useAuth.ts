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

  async function signInWithMagicLink(input: LoginWithMagicLinkInput): Promise<void> {
    const { email } = loginWithMagicLinkSchema.parse(input)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      throw error
    }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    authStore.clear()
    await navigateTo('/login')
  }

  return { signInWithPassword, signInWithMagicLink, signOut }
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
