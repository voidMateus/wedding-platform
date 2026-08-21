import { serverSupabaseClient } from '#supabase/server'

// Exclusão física direta: diferente de guest_groups, nada referencia
// etapas_evento por FK, e cronograma não tem valor histórico por convidado
// para preservar (CLAUDE.md, seção 11 — soft delete é para convidados/
// presentes, e convites por causa do RESTRICT em convidados.convite_id).
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do item do cronograma não informado.')
  }

  const client = await serverSupabaseClient(event)

  // Não deleta silenciosamente um local que outro item ainda reaproveita
  // (mesmo_local_que) — o item dependente ficaria sem endereço nenhum
  // (on delete set null zeraria a referência, mas o local em si nunca foi
  // duplicado nesse item — CLAUDE.md, 12.2). Pede pra desvincular antes.
  const { data: dependents, error: dependentsError } = await client
    .from('etapas_evento')
    .select('id, titulo')
    .eq('mesmo_local_que', id)

  if (dependentsError) {
    throw badRequestError(dependentsError.message)
  }
  if (dependents.length > 0) {
    throw badRequestError(
      `Não é possível excluir: ${dependents.map((d) => d.titulo).join(', ')} usa este local. Altere o local desses itens antes de excluir.`,
    )
  }

  const { data, error } = await client
    .from('etapas_evento')
    .delete()
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id, titulo')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Item do cronograma não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'event_segment.delete',
    entityType: 'event_segment',
    entityId: data.id,
    metadata: { title: data.titulo },
  })

  return { id: data.id }
})
