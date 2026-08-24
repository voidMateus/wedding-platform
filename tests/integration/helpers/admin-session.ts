import { createServerClient, serializeCookieHeader } from '@supabase/ssr'

/**
 * Gera o(s) cookie(s) de sessão administrativa exatamente como
 * `@nuxtjs/supabase` gravaria no browser (mesma lib, `@supabase/ssr`, usada
 * por `server/utils/wedding-context.ts` para ler a sessão) — necessário
 * porque os testes de integração de `tests/integration/api/` batem via HTTP
 * puro no servidor de build, sem um browser de verdade guardando cookie.
 */
export async function getAdminSessionCookie(email: string, password: string): Promise<string> {
  const setCookies: string[] = []

  const client = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => [],
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          setCookies.push(serializeCookieHeader(name, value, options))
        }
      },
    },
  })

  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`Falha ao autenticar sessão administrativa de teste: ${error.message}`)
  }
  if (setCookies.length === 0) {
    throw new Error('Login de teste não gerou nenhum cookie de sessão — verifique SUPABASE_URL/ANON_KEY.')
  }

  // serializeCookieHeader devolve "nome=valor; Path=...; HttpOnly; ..." — só o
  // primeiro segmento (antes do primeiro ';') é o que vai no header Cookie.
  return setCookies.map((raw) => raw.split(';')[0]).join('; ')
}
