import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete (CLAUDE.md, seção 11) — preserva o histórico em
 * reservas_presentes/contribuicoes_presentes mesmo após o presente ser
 * removido da vitrine/CRUD ativo.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('presentes')
    .update({ excluido_em: new Date().toISOString() })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select('id, titulo')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Presente não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift.delete',
    entityType: 'gift',
    entityId: id,
    metadata: { title: data.titulo },
  })

  return { id }
})
