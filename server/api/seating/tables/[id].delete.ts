import { serverSupabaseClient } from '#supabase/server'

/**
 * Exclusão FÍSICA, contra a convenção de soft delete, e de propósito.
 *
 * A regra do CLAUDE.md pede soft delete "para entidades com valor histórico
 * próprio", e a mesa não tem: ela é rascunho de layout, criada e desfeita
 * dezenas de vezes enquanto o salão é montado, e o dado que importa (quem é
 * convidado) nunca mora nela. Soft delete aqui criaria um estado fantasma —
 * pessoas com `mesa_id` apontando para uma mesa invisível, sumindo da ocupação
 * sem reaparecer em "falta acomodar".
 *
 * Com `on delete set null`, o banco devolve essas pessoas à fila sozinho. A
 * confirmação da tela diz antes quantas são.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw badRequestError('id da mesa não informado.')

  const client = await serverSupabaseClient(event)

  const { data: mesa, error: leituraError } = await client
    .from('mesas')
    .select('id, nome')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (leituraError) throw badRequestError(leituraError.message)
  if (!mesa) throw notFoundError('Mesa não encontrada.')

  const { error } = await client.from('mesas').delete().eq('id', id)
  if (error) throw badRequestError(error.message)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'table.delete',
    entityType: 'table',
    entityId: id,
    metadata: { nome: mesa.nome },
  })

  return { id }
})
