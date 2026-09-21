import { serverSupabaseClient } from '#supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * A volta do link de e-mail, verificada no SERVIDOR.
 *
 * O link traz o `token_hash` do OTP; `verifyOtp` o troca por uma sessão, e o
 * client de servidor grava os cookies na resposta antes do redirecionamento —
 * então quem chega em `/admin` já está logado, sem nenhuma troca no navegador.
 * É o que faz o link funcionar no aparelho que abriu o e-mail, e não só naquele
 * que o pediu (docs/rodada-usabilidade-2026-09.md, itens A1 e B2).
 *
 * Rota de servidor, e não página: uma página só existe depois do HTML, e aqui
 * o que precisa acontecer é a resposta trazer os cookies. A página
 * `/auth/callback` continua existindo para o fluxo com `?code=` — enquanto os
 * templates do Auth não forem trocados nos três ambientes, os dois caminhos
 * chegam —, e é também a tela que este handler usa para EXPLICAR uma falha.
 */

/** Os tipos de link que o Supabase Auth emite por e-mail. */
const TIPOS: readonly EmailOtpType[] = ['magiclink', 'signup', 'invite', 'recovery', 'email_change']

/**
 * Onde cada tipo termina.
 *
 * Convite e recuperação param na definição de senha: nos dois, a pessoa acabou
 * de provar que é dona da caixa de e-mail e ainda não tem — ou não lembra — uma
 * senha. Mandá-la direto ao painel a deixaria dependente do link para sempre.
 */
const DESTINO_POR_TIPO: Partial<Record<EmailOtpType, string>> = {
  invite: '/auth/senha?novo=1',
  recovery: '/auth/senha',
}

const DESTINO_PADRAO = '/admin'

/** Só caminho interno: um destino absoluto faria disto um redirecionador aberto. */
function destinoPedido(valor: unknown): string | null {
  return typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//')
    ? valor
    : null
}

function telaDeErro(codigo: string, descricao: string): string {
  const parametros = new URLSearchParams({
    error_code: codigo,
    error_description: descricao,
  })
  return `/auth/callback?${parametros.toString()}`
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const tokenHash = typeof query.token_hash === 'string' ? query.token_hash : ''
  const tipo = TIPOS.find((candidato) => candidato === query.type)

  if (!tokenHash || !tipo) {
    return sendRedirect(
      event,
      telaDeErro('link_incompleto', 'O endereço não traz um link de acesso válido.'),
    )
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: tipo })

  if (error) {
    // A resposta do provedor vai inteira para a tela: "expirou", "já foi usado"
    // e "tipo errado" pedem ações diferentes de quem está tentando entrar.
    return sendRedirect(event, telaDeErro(error.code ?? 'verificacao_falhou', error.message))
  }

  return sendRedirect(event, destinoPedido(query.next) ?? DESTINO_POR_TIPO[tipo] ?? DESTINO_PADRAO)
})
