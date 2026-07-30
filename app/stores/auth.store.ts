import { defineStore } from 'pinia'
import type { WeddingContext } from '~/types/auth'

interface AuthSessionUser {
  id: string
  email: string | null
}

interface SessionResponse {
  user: AuthSessionUser | null
  weddingContext: WeddingContext | null
}

/**
 * Última versão conhecida da sessão administrativa (CLAUDE.md, seção 10) —
 * não é a fonte de verdade (isso é o cookie de sessão do Supabase Auth,
 * exposto via useSupabaseUser()), só um cache síncrono do wedding_id/role
 * resolvido em /api/auth/session, que exige uma query própria.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthSessionUser | null>(null)
  const weddingContext = ref<WeddingContext | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  async function fetchSession(): Promise<void> {
    loading.value = true
    try {
      const session = await $fetch<SessionResponse>('/api/auth/session')
      user.value = session.user
      weddingContext.value = session.weddingContext
    } finally {
      loading.value = false
    }
  }

  function clear(): void {
    user.value = null
    weddingContext.value = null
  }

  return { user, weddingContext, loading, isAuthenticated, fetchSession, clear }
})
