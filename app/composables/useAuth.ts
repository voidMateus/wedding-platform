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
   * Pede o link de acesso — pelo SERVIDOR, nunca pelo client daqui.
   *
   * Quem pede decide o formato do link: pedido por um client PKCE, ele só vale
   * no navegador que o pediu, e o casal que pede no computador e abre o e-mail
   * no celular nunca entra. `POST /api/auth/magic-link` pede sem PKCE, e o
   * e-mail passa a trazer o `token_hash` que o servidor verifica
   * (`server/utils/link-de-acesso.ts`).
   */
  async function signInWithMagicLink(input: LoginWithMagicLinkInput): Promise<void> {
    const { email } = loginWithMagicLinkSchema.parse(input)
    await $fetch('/api/auth/magic-link', { method: 'POST', body: { email } })
  }

  /**
   * Pede a redefinição de senha — também pelo servidor, e pelo mesmo motivo do
   * link de acesso: é justamente quem está sem entrar que pode estar em outro
   * aparelho.
   */
  async function pedirRedefinicaoDeSenha(input: LoginWithMagicLinkInput): Promise<void> {
    const { email } = loginWithMagicLinkSchema.parse(input)
    await $fetch('/api/auth/password-reset', { method: 'POST', body: { email } })
  }

  /**
   * Grava a senha na sessão que **já existe**.
   *
   * Não há rota nossa no meio: quem autoriza a troca é o próprio Supabase, pela
   * sessão do navegador — a de recuperação, a do convite, ou a de quem já está
   * logado e troca a senha em Configurações. Um endpoint nosso só acrescentaria
   * um lugar onde a senha passa.
   */
  async function definirSenha(senha: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: senha })
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
   * Fecha o acesso que veio de um link de e-mail, venha ele como vier.
   *
   * São três chegadas possíveis, e as três passam por aqui: o `?code=` do PKCE
   * (o que os templates antigos do Auth ainda produzem), os tokens no fragmento
   * do fluxo implícito — que o próprio client já recolhe ao inicializar — e a
   * sessão que `/auth/confirmar` gravou nos cookies antes de redirecionar. Por
   * isso o `code` é opcional: sessão que já existe é acesso concluído, não
   * falta de parâmetro.
   *
   * Espera o usuário reativo aparecer pelo mesmo motivo de
   * `signInWithPassword`: o cookie é gravado antes de `useSupabaseUser()`
   * reagir, e um `navigateTo('/admin')` imediato chegaria ao middleware sem
   * usuário — que devolveria a pessoa para o login logo depois de ela ter
   * entrado com sucesso.
   */
  async function completarAcessoPorLink(code: string | null): Promise<void> {
    // OLHAR ANTES DE AGIR. O client do navegador já troca o código sozinho ao
    // inicializar — `detectSessionInUrl` vem ligado por padrão, e
    // `_isPKCECallback` reconhece o `?code=` da URL. Quando ele consegue, o
    // verificador (de uso único) já foi consumido, e uma segunda troca falha
    // com `PKCE code verifier not found in storage`.
    //
    // Era o que acontecia: o acesso funcionava e a tela relatava um erro sobre
    // a tentativa redundante, apontando para uma causa que não existia.
    // `getSession()` espera a inicialização do client terminar, então esta
    // leitura não corre com a troca automática.
    const { data: jaLogado } = await supabase.auth.getSession()

    if (!jaLogado.session) {
      if (!code) {
        throw new Error('Este endereço não tem um link de acesso válido.')
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        throw error
      }
    }

    await waitForSupabaseUser()
    await authStore.fetchSession()
  }

  return {
    signInWithPassword,
    signInWithMagicLink,
    pedirRedefinicaoDeSenha,
    definirSenha,
    signOut,
    completarAcessoPorLink,
    aguardarUsuario: waitForSupabaseUser,
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
