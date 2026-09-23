import { loginWithMagicLinkSchema } from '#shared/schemas/auth'

/**
 * Pedir a redefinição de senha.
 *
 * No servidor pelo mesmo motivo de `magic-link.post.ts`: quem pede decide o
 * formato do link, e um client PKCE no navegador prenderia a recuperação ao
 * aparelho que a pediu — que é justamente o caso em que a pessoa já está sem
 * acesso e pode estar em outro lugar.
 *
 * A resposta é sempre a mesma, exista a conta ou não: dizer "este e-mail não
 * tem conta" transforma a tela de login num verificador de quem é cliente da
 * plataforma. Quem digitou errado descobre pelo e-mail que não chega, que é o
 * mesmo sinal de sempre.
 *
 * auditoria dispensada: atende quem não tem sessão — não há membro a quem
 * atribuir a ação, e o e-mail pode não pertencer a usuário nenhum. Mesmo
 * raciocínio de `magic-link.post.ts`.
 */
export default defineEventHandler(async (event) => {
  const { email } = await validateBody(event, loginWithMagicLinkSchema)

  const config = useRuntimeConfig()
  const origem = config.public.siteUrl || getRequestURL(event).origin

  const { error } = await clienteDeLinkDeAcesso().auth.resetPasswordForEmail(email, {
    // Vale só enquanto algum ambiente tiver o template antigo: ali o link é
    // montado a partir daqui. Com o template novo, quem manda é o
    // `{{ .TokenHash }}`, e o destino depois da verificação é decidido por
    // `/auth/confirmar` a partir do tipo.
    redirectTo: `${origem}/auth/senha`,
  })

  if (error && !eContaInexistente(error.message, error.code)) {
    throw badRequestError(error.message)
  }

  return { enviado: true }
})
