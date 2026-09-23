import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * O client que PEDE os e-mails de acesso — e o único do projeto deliberadamente
 * **sem PKCE**.
 *
 * O PKCE guarda um verificador de uso único em quem pediu o link, e o link não
 * carrega identificação do fluxo. Disso decorrem as três limitações medidas em
 * 21/09/2026 (docs/rodada-usabilidade-2026-09.md, item A1): quem pede no
 * computador e abre o e-mail no celular nunca entra — que é o caso normal do
 * produto, não a exceção —, pedir um segundo link inutiliza o primeiro, e um
 * envio que falha no provedor deixa sem par o link que porventura saiu.
 *
 * Sem PKCE, o e-mail carrega o `token_hash` do OTP, e quem o verifica é o
 * SERVIDOR (`server/routes/auth/confirmar.get.ts`), que grava a sessão nos
 * cookies da resposta. Nada depende de storage de navegador, então o link
 * funciona no aparelho que abrir o e-mail. É o caminho que o próprio Supabase
 * recomenda para aplicação com servidor.
 *
 * O preço, e ele é real: um link assim é credencial ao portador, então quem
 * interceptar o e-mail entra. É o modelo de todo link mágico — a defesa é a
 * validade curta do OTP, configurada no projeto.
 *
 * Client próprio, e não `serverSupabaseClient(event)`: aquele é preso aos
 * cookies da requisição (é o que faz a verificação gravar a sessão), e pedir um
 * link não deve tocar sessão nenhuma.
 */
let cliente: SupabaseClient<Database> | null = null

export function clienteDeLinkDeAcesso(): SupabaseClient<Database> {
  if (!cliente) {
    const { url, key } = useRuntimeConfig().public.supabase

    cliente = createClient<Database>(url, key, {
      auth: {
        flowType: 'implicit',
        // Este client não é de ninguém: ele só dispara e-mail. Persistir
        // sessão aqui misturaria o acesso de uma pessoa com o processo do
        // servidor, que atende todas.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  return cliente
}

/**
 * O envio falhou porque o e-mail não pertence a ninguém?
 *
 * A resposta ao visitante é a mesma nos dois casos, de propósito: um formulário
 * que diz "este e-mail não tem conta" transforma a tela de login num verificador
 * de quem é cliente da plataforma.
 */
export function eContaInexistente(mensagem: string, codigo?: string): boolean {
  return (
    codigo === 'otp_disabled' ||
    codigo === 'signup_disabled' ||
    /signups? not allowed/i.test(mensagem) ||
    /user not found/i.test(mensagem)
  )
}
