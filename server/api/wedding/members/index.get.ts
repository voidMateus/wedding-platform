import { serverSupabaseClient } from '#supabase/server'

/**
 * Lista os membros do casamento ativo (docs/PLANO-SAAS.md, Passo 3) — tela
 * de "Colaboradores" em /admin/configuracoes. Qualquer membro pode ver a
 * lista (RLS: membros_casamento_select_membro), só o dono pode convidar/
 * remover.
 */
export default defineEventHandler(async (event) => {
  const context = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('membros_casamento')
    .select('id, usuario_id, papel, created_at')
    .eq('casamento_id', context.weddingId)
    .order('created_at', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  return { data: data ?? [] }
})
