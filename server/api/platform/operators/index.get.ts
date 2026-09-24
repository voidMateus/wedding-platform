import { serverSupabaseUser } from '#supabase/server'

/**
 * Quem é operador da plataforma (docs/fase6-contas-e-acessos.md §8).
 *
 * `operadores_plataforma` é extensão 1:1 de `auth.users` e guarda só o id — o
 * e-mail vive no Auth, que não tem busca por id em lote. `listarTodosUsuarios`
 * pagina o Admin API e já existia pelo mesmo motivo em duas outras telas
 * (foi ele que consertou o painel interno mostrar UUID cru onde devia mostrar
 * e-mail, em 2026-09-15).
 *
 * Marca qual linha é a de quem está olhando, porque a regra de autoalteração
 * (decisão 4.7) precisa ser visível ANTES do clique: um botão que só recusa
 * depois de apertado ensina menos que um botão que não existe.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)
  const admin = supabaseAdmin(event)

  const { data: linhas, error } = await admin
    .from('operadores_plataforma')
    .select('usuario_id, created_at')
    .order('created_at', { ascending: true })

  if (error) throw badRequestError(error.message)

  const usuarios = await listarTodosUsuarios(admin)
  const emailPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario.email ?? null]))

  return {
    data: (linhas ?? []).map((linha) => ({
      usuarioId: linha.usuario_id,
      email: emailPorId.get(linha.usuario_id) ?? null,
      desde: linha.created_at,
      souEu: linha.usuario_id === operador?.sub,
    })),
  }
})
