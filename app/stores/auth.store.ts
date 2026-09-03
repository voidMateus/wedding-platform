import { defineStore } from 'pinia'
import type { WeddingContext, WeddingMembership } from '~/types/auth'

interface AuthSessionUser {
  id: string
  email: string | null
}

interface SessionResponse {
  user: AuthSessionUser | null
  weddingContext: WeddingContext | null
  memberships: WeddingMembership[]
  isPlatformOperator: boolean
}

/**
 * Última versão conhecida da sessão administrativa (CLAUDE.md, seção 10) —
 * não é a fonte de verdade (isso é o cookie de sessão do Supabase Auth,
 * exposto via useSupabaseUser()), só um cache síncrono do casamento_id/papel
 * ativo e da lista completa de casamentos administrados (docs/PLANO-SAAS.md,
 * Passo 3 — usada pela tela de seleção pós-login) e do status de operador de
 * plataforma (Passo 8 — só UX do middleware de /plataforma, nunca a fonte
 * real de autorização), resolvidos em /api/auth/session, que exige uma
 * query própria.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthSessionUser | null>(null)
  const weddingContext = ref<WeddingContext | null>(null)
  const memberships = ref<WeddingMembership[]>([])
  const isPlatformOperator = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  async function fetchSession(): Promise<void> {
    loading.value = true
    try {
      // useRequestFetch() (não $fetch direto) — durante SSR, o $fetch global
      // não repassa os cookies da requisição original pra essa chamada
      // interna a /api/auth/session, então serverSupabaseUser() do lado de
      // dentro sempre veria "ninguém logado" nessa passada específica. Achado
      // real desta sessão: quebrava a validação de slug de
      // app/middleware/auth.global.ts (docs/PLANO-SAAS.md, Passo 3) num
      // refresh direto em /admin/{slug}/**, redirecionando de volta pro
      // /admin mesmo com a membership existindo de verdade.
      const session = await useRequestFetch()<SessionResponse>('/api/auth/session')
      user.value = session.user
      weddingContext.value = session.weddingContext
      memberships.value = session.memberships
      isPlatformOperator.value = session.isPlatformOperator
    } finally {
      loading.value = false
    }
  }

  function clear(): void {
    user.value = null
    weddingContext.value = null
    memberships.value = []
    isPlatformOperator.value = false
  }

  return {
    user,
    weddingContext,
    memberships,
    isPlatformOperator,
    loading,
    isAuthenticated,
    fetchSession,
    clear,
  }
})
