import { serverSupabaseClient } from '#supabase/server'
import { budgetTotalSchema } from '#shared/schemas/finance'

/**
 * Teto global do casamento (`casamentos.orcamento_total_centavos`).
 *
 * Endpoint próprio, e não um campo a mais em `PATCH /api/wedding`: aquele
 * reescreve o conjunto COMPLETO das configurações do evento de uma vez (é o
 * "salvar" da tela de Configurações). Mandar o formulário inteiro a partir do
 * Financeiro é exatamente como um campo alheio acaba sobrescrito por um valor
 * velho carregado noutra tela.
 *
 * `null` é entrada legítima: é como o casal apaga o teto e volta a trabalhar
 * só com o planejado por categoria.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, budgetTotalSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('casamentos')
    .update({ orcamento_total_centavos: input.orcamentoTotalCentavos })
    .eq('id', weddingId)
    .select('orcamento_total_centavos')
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.budget_total.update',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return data
})
