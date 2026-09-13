import { serverSupabaseClient } from '#supabase/server'

/** Sem soft delete — etiquetas_convite não carrega valor histórico próprio (CLAUDE.md, seção 12.1). */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id da etiqueta não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client
    .from('etiquetas_convite')
    .delete()
    .eq('id', id)
    .eq('casamento_id', weddingId)

  if (error) throw badRequestError(error.message)

  // Exclusão é a ação que a seção 11 do CLAUDE.md nomeia primeiro — e aqui ela
  // é FÍSICA, então a trilha é o único lugar onde a etiqueta continua existindo
  // depois de sumir das telas.
  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite_tag.delete',
    entityType: 'invite_tag',
    entityId: id,
  })

  return { id }
})
