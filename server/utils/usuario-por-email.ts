import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * Resolve o usuário de `auth.users` por e-mail, convidando quem ainda não
 * existe — e **sempre fora de qualquer transação do banco**
 * (docs/fase5-multievento.md 6.2).
 *
 * Esta é a fronteira transacional do produto: `inviteUserByEmail` cria uma
 * linha em `auth.users` E dispara um e-mail, e nem uma coisa nem a outra volta
 * atrás com um `rollback`. Ler "em transação" como "tudo é revertível" é
 * exatamente o erro que este comentário existe para impedir.
 *
 * Daí a ordem em quem chama: resolver o usuário ANTES de escrever as entidades
 * do banco. Se isto falha, nada foi criado no nosso schema e retentar é limpo;
 * se a transação seguinte falha, sobra no pior caso um convite para alguém que
 * ainda não pertence a casamento nenhum — resíduo do lado barato, autocurável
 * (a próxima tentativa reaproveita o usuário) e com destino já implementado:
 * o estado vazio de `/admin`, "Nenhum casamento vinculado".
 *
 * Nasceu em `POST /api/wedding/members`, e saiu de lá quando a criação de
 * casamento passou a precisar do mesmo passo — copiar teria duplicado também
 * o defeito de paginação que a extração expôs (ver `listarTodosUsuarios`).
 */
const USUARIOS_POR_PAGINA = 1000

/**
 * Todos os usuários de `auth.users`, percorrendo as páginas.
 *
 * `listUsers()` sem argumento devolve **50** — e a API de admin não tem busca
 * por e-mail direta, então quem precisa achar alguém precisa percorrer tudo.
 * O código antigo chamava sem paginar, com o comentário "suficiente na escala
 * atual"; em 2026-09-15 o ambiente de `dev` tinha 251 usuários, e o efeito era
 * real nos dois chamadores: convidar alguém que já existia mas estava fora dos
 * 50 primeiros tentava convidá-lo de novo e falhava, e o painel interno
 * mostrava 7 de 10 donos como UUID cru em vez do e-mail.
 *
 * O teto de páginas é uma trava contra laço infinito, não um limite de
 * produto: 40 × 1000 é mais usuário do que a plataforma terá antes de esta
 * listagem inteira precisar virar outra coisa.
 */
export async function listarTodosUsuarios(admin: SupabaseClient<Database>) {
  const todos = []

  for (let pagina = 1; pagina <= 40; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: pagina,
      perPage: USUARIOS_POR_PAGINA,
    })
    if (error) {
      throw badRequestError(error.message)
    }

    todos.push(...data.users)
    if (data.users.length < USUARIOS_POR_PAGINA) {
      break
    }
  }

  return todos
}

export async function resolverOuConvidarUsuario(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<string> {
  // Reaproveita o usuário se o e-mail já existir (ex.: já é dono/colaborador
  // de outro casamento) — convidar de novo falharia, e criar um segundo
  // usuário duplicaria a pessoa.
  const usuarios = await listarTodosUsuarios(admin)

  const existing = usuarios.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    return existing.id
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
  if (inviteError || !invited.user) {
    throw badRequestError(inviteError?.message ?? 'Não foi possível convidar este e-mail.')
  }

  return invited.user.id
}
