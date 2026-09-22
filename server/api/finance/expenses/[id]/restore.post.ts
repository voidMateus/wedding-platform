import { serverSupabaseClient } from '#supabase/server'

/**
 * Desfazer a exclusão de um gasto.
 *
 * O soft delete sempre permitiu voltar atrás; o que não existia era o caminho.
 * Ele nasce junto do menu de linha do planejamento por categoria (rodada de
 * usabilidade de 20/09/2026, ponto 15): numa tela em que criar custa um Enter,
 * um diálogo de confirmação a cada exclusão cobra mais do que o gesto que ele
 * protege — e é o desfazer que torna aceitável excluir sem perguntar.
 *
 * As parcelas voltam junto, sem nada a fazer aqui: elas nunca saíram da tabela
 * (a FK é `on delete cascade`, e o delete é lógico), e toda leitura do módulo
 * parte das despesas ativas.
 *
 * `.not('excluido_em', 'is', null)` é o que torna a rota idempotente do lado
 * certo: restaurar um gasto que já está ativo não é sucesso silencioso, é 404 —
 * quem chamou está falando de um gasto que não é o que ele pensa.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Despesa não informada.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('despesas')
    .update({ excluido_em: null })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .not('excluido_em', 'is', null)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Gasto não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.expense.restore',
    entityType: 'expense',
    entityId: id,
  })

  return data
})
