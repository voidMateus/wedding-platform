import { serverSupabaseUser } from '#supabase/server'

/**
 * Revoga o acesso de operador da plataforma (docs/fase6-contas-e-acessos.md §8).
 *
 * auditoria em transação: a trilha nasce dentro de
 * `revogar_operador_plataforma()`, no mesmo commit do `delete` — e é por isso
 * que revogar não pode apagar o registro de quem agiu: as FKs da trilha são
 * `on delete set null`, e o e-mail do alvo vai denormalizado (invariante 5).
 *
 * ## As duas recusas moram no banco, não aqui
 *
 * **Autoalteração** (4.7) e **nunca ficar sem operador** (invariante 1) são
 * checadas dentro da função. Não por gosto de SQL: a segunda só é alcançável
 * por CORRIDA — A revoga B enquanto B revoga A, as duas passando por checagens
 * que eram verdadeiras quando cada uma as fez. Só o `for update` da função
 * serializa isso. A regra é importante demais para viver onde há janela entre
 * ler e escrever (CLAUDE.md seção 10).
 *
 * Aqui só se traduz o erro do banco em status HTTP, para a tela dizer o que
 * aconteceu sem inspecionar mensagem de Postgres.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)
  const admin = supabaseAdmin(event)

  const usuarioId = getRouterParam(event, 'userId')
  if (!usuarioId) {
    throw badRequestError('Usuário não informado.')
  }

  // O e-mail vai para a trilha, que precisa continuar legível depois de a conta
  // sumir. Lido ANTES da revogação, que é quando ele ainda existe com certeza.
  const { data: usuario } = await admin.auth.admin.getUserById(usuarioId)
  const email = usuario?.user?.email ?? 'desconhecido'

  const { error } = await admin.rpc('revogar_operador_plataforma', {
    p_alvo: usuarioId,
    p_ator: operador!.sub,
    p_alvo_email: email,
  })

  if (error) {
    // 'P0002' — alvo não é operador. Os demais são recusas de regra, não
    // pedidos malformados: quem chamou fez tudo certo e a plataforma disse não.
    if (error.code === 'P0002') {
      throw notFoundError('Este usuário não é operador da plataforma.')
    }
    throw createError({ statusCode: 409, statusMessage: error.message })
  }

  return { data: { usuarioId, revogado: true } }
})
