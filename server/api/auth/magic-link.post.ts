import { loginWithMagicLinkSchema } from '#shared/schemas/auth'

/**
 * Pedir o link de acesso por e-mail.
 *
 * Saiu do navegador (`useAuth.signInWithMagicLink` chamava
 * `supabase.auth.signInWithOtp` direto) porque o pedido é o que decide o
 * formato do link: feito por um client PKCE, ele só vale no navegador que o
 * pediu; feito aqui, ele carrega o `token_hash` que o servidor verifica
 * (`server/utils/link-de-acesso.ts`).
 *
 * **`shouldCreateUser: false`** fecha um buraco que existia desde sempre: sem
 * ele, digitar qualquer e-mail na tela de login CRIAVA a conta. A plataforma
 * não tem cadastro self-service — quem cria casamento e dono é a equipe interna
 * (docs/fase5-multievento.md seção 6) —, e um usuário nascido assim ficava sem
 * casamento nenhum, ocupando `auth.users` e a listagem do painel interno.
 *
 * A resposta é a mesma para e-mail com e sem conta, e isso é intencional: a
 * diferença transformaria o login num verificador de quem é cliente.
 *
 * auditoria dispensada: esta rota atende justamente quem ainda NÃO tem sessão —
 * não há membro a quem atribuir a ação, e o e-mail pode não pertencer a usuário
 * nenhum. A trilha registra o que se faz DENTRO de um casamento; tentativa de
 * autenticação é assunto do log do Auth, não dela.
 */
export default defineEventHandler(async (event) => {
  const { email } = await validateBody(event, loginWithMagicLinkSchema)

  // `emailRedirectTo` continua sendo passado, embora o template novo não o use:
  // enquanto algum ambiente ainda tiver o template antigo, é ele que faz o
  // `{{ .ConfirmationURL }}` apontar para `/auth/callback` em vez da raiz do
  // domínio — e aí a página recolhe os tokens do fragmento. Tirar isto antes de
  // trocar os quatro templates derrubaria o acesso por link sem nenhum erro
  // aparecer: o clique levaria a uma página neutra, exatamente como no ponto 5.
  const config = useRuntimeConfig()
  const origem = config.public.siteUrl || getRequestURL(event).origin

  const { error } = await clienteDeLinkDeAcesso().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origem}/auth/callback`,
    },
  })

  if (error && !eContaInexistente(error.message, error.code)) {
    throw badRequestError(error.message)
  }

  return { enviado: true }
})
