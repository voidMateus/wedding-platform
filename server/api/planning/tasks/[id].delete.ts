import { serverSupabaseClient } from '#supabase/server'

/**
 * Exclusão FÍSICA, contra a convenção de soft delete do projeto.
 *
 * Mesma decisão de `mesas` e `etapas_evento`: nenhuma outra tabela referencia
 * uma tarefa, e ela não tem valor histórico próprio. Excluir aqui é "não vou
 * fazer isso", não "isto deixou de ter acontecido" — e uma tarefa nascida de
 * sugestão precisa sumir de verdade para a sugestão voltar ao rodapé.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Tarefa não informada.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('tarefas')
    .delete()
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id, titulo')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Tarefa não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'planning.task.delete',
    entityType: 'task',
    entityId: id,
    metadata: { titulo: data.titulo },
  })

  return { id }
})
