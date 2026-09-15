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
 * a limitação de paginação documentada abaixo.
 */
export async function resolverOuConvidarUsuario(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<string> {
  // Reaproveita o usuário se o e-mail já existir (ex.: já é dono/colaborador
  // de outro casamento) — convidar de novo falharia, e criar um segundo
  // usuário duplicaria a pessoa. A API de admin não tem busca por e-mail
  // direta, só listagem paginada — suficiente na escala atual do produto.
  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    throw badRequestError(listError.message)
  }

  const existing = existingUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    return existing.id
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
  if (inviteError || !invited.user) {
    throw badRequestError(inviteError?.message ?? 'Não foi possível convidar este e-mail.')
  }

  return invited.user.id
}
