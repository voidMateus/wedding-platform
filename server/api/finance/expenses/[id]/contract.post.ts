import { serverSupabaseClient } from '#supabase/server'
import { expenseContractSchema } from '#shared/schemas/finance'

/**
 * Registrar o valor fechado de um gasto — com ou sem fornecedor.
 *
 * A rota do OBJETO certo: no Financeiro existe um objeto, o gasto, e contratar
 * é preencher o custo final dele (CLAUDE.md, seção 12). `/vendors/:id/contract`
 * continua existindo para quem contrata a partir de uma proposta, e faz
 * exatamente o mesmo — as duas chamam `contratarGasto()`.
 *
 * Ela nasceu para fechar o ponto 16 da rodada de usabilidade: sem ela, o caminho
 * sem fornecedor era montado no client com um PATCH seguido de um POST de
 * parcelas, e cada um disparava as quatro releituras do módulo enquanto a modal
 * ainda estava aberta. Um ato, uma chamada, uma releitura.
 *
 * auditoria delegada: server/utils/contratar-gasto.ts — contratar é um fato
 * só, e registrá-lo nas duas rotas seria duplicar a chance de elas divergirem.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Gasto não informado.')
  }

  const input = await validateBody(event, expenseContractSchema)
  const client = await serverSupabaseClient(event)

  return contratarGasto(event, client, weddingId, memberId, {
    despesaId: id,
    valorCentavos: input.valorCentavos,
    parcelamento: input.parcelamento,
    fornecedorId: input.fornecedorId ?? null,
  })
})
