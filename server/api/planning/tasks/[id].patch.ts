import { serverSupabaseClient } from '#supabase/server'
import { taskPatchSchema } from '#shared/schemas/planejamento'

/**
 * Edita a tarefa — inclusive concluir e desconcluir.
 *
 * `concluida: true/false` vira o timestamp aqui dentro. O client nunca manda a
 * hora: quando a tarefa foi concluída é fato do servidor, e aceitar o relógio
 * do navegador deixaria a máquina de quem clicou definir se a tarefa venceu.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Tarefa não informada.')
  }

  const input = await validateBody(event, taskPatchSchema)

  const atualizacao: Record<string, unknown> = {}
  if (input.titulo !== undefined) atualizacao.titulo = input.titulo
  if (input.prazo !== undefined) atualizacao.prazo = input.prazo ?? null
  if (input.responsavel !== undefined) atualizacao.responsavel = input.responsavel ?? null
  if (input.observacao !== undefined) atualizacao.observacao = input.observacao ?? null
  if (input.concluida !== undefined) {
    atualizacao.concluida_em = input.concluida ? new Date().toISOString() : null
  }

  if (Object.keys(atualizacao).length === 0) {
    throw badRequestError('Nada para atualizar.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('tarefas')
    .update(atualizacao)
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Tarefa não encontrada.')
  }

  // Concluir é o gesto que mais se repete no módulo; registrá-lo em auditoria a
  // cada clique encheria a trilha de ruído sem responder nada. Fica só o que
  // muda o conteúdo da lista.
  if (input.concluida === undefined) {
    await recordAuditLog(event, weddingId, memberId, {
      action: 'planning.task.update',
      entityType: 'task',
      entityId: data.id,
    })
  }

  return data
})
