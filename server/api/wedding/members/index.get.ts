/**
 * Lista os membros do casamento ativo (docs/PLANO-SAAS.md, Passo 3) — tela
 * de "Colaboradores" em /admin/configuracoes. Qualquer membro pode ver a
 * lista. Usa service_role (não o client autenticado da requisição, RLS não
 * protege nada aqui de qualquer forma) porque o e-mail de cada membro só
 * existe em auth.users, inacessível via PostgREST mesmo sob RLS — só a API
 * de Admin do Supabase Auth enxerga esse schema. Seguro porque
 * `context.weddingId` já vem resolvido a partir do JWT (nunca do client,
 * CLAUDE.md seção 4.2), então o filtro por casamento_id abaixo não pode
 * vazar membro de outro casamento.
 */
export default defineEventHandler(async (event) => {
  const context = await requireWeddingContext(event)
  const admin = supabaseAdmin(event)

  const { data, error } = await admin
    .from('membros_casamento')
    .select('id, usuario_id, papel, created_at')
    .eq('casamento_id', context.weddingId)
    .order('created_at', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  const members = data ?? []
  const withEmail = await Promise.all(
    members.map(async (member) => {
      const { data: user } = await admin.auth.admin.getUserById(member.usuario_id)
      return { ...member, email: user.user?.email ?? null }
    }),
  )

  return { data: withEmail }
})
