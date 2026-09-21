import { serverSupabaseClient } from '#supabase/server'
import { vendorContractSchema } from '#shared/schemas/finance'

/**
 * Contratar um fornecedor — a ponte entre as três telas do módulo.
 *
 * O casal planeja o gasto no Orçamento ("Buffet, estimado R$ 12.000"), cota
 * fornecedores, e aqui diz a qual gasto a proposta fechada corresponde. O
 * efeito é o que o produto promete:
 *
 *   1. o gasto ganha custo FINAL (deixa de ser estimativa e vira compromisso);
 *   2. o fornecedor fica vinculado a ele;
 *   3. o estágio do fornecedor vai para `contratado`;
 *   4. as parcelas nascem — e o dinheiro aparece em Pagamentos.
 *
 * A cotação continua fora de qualquer total: três buffets concorrentes somariam
 * três vezes o mesmo gasto. É contratar, e só contratar, que move dinheiro para
 * o orçamento real.
 *
 * O trabalho em si vive em `server/utils/contratar-gasto.ts`, compartilhado com
 * `POST /expenses/:id/contract` — que é o mesmo ato a partir do gasto, para
 * quem fecha um valor sem ter cotado ninguém. Duas portas, um caminho: era a
 * cópia dessa lógica no client que fazia a tela piscar (rodada de usabilidade
 * de 20/09/2026, ponto 16).
 *
 * auditoria delegada: server/utils/contratar-gasto.ts — contratar é um fato
 * só, e registrá-lo nas duas rotas seria duplicar a chance de elas divergirem.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Fornecedor não informado.')
  }

  const input = await validateBody(event, vendorContractSchema)
  const client = await serverSupabaseClient(event)

  return contratarGasto(event, client, weddingId, memberId, {
    despesaId: input.despesaId,
    valorCentavos: input.valorCentavos,
    parcelamento: input.parcelamento,
    fornecedorId: id,
  })
})
