import { serverSupabaseClient } from '#supabase/server'
import { situacaoFinanceiraFornecedor, totaisDaDespesa } from '#shared/utils/orcamento'
import type { FornecedorComSituacao } from '~/types/finance'

/**
 * Fornecedores com a situação financeira DERIVADA das despesas ligadas a cada
 * um (sem despesa / a pagar / quitado).
 *
 * "Pago" não é estágio de negociação: o fornecedor contratado cujas parcelas
 * acabaram está quitado sem ninguém marcar nada, e o que tem saldo continua
 * "a pagar" mesmo que alguém tenha esquecido de mexer no pipeline.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [fornecedoresResult, despesasResult, parcelasResult] = await Promise.all([
    client
      .from('fornecedores')
      .select('*, categoria:categorias_orcamento (id, nome)')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .order('nome', { ascending: true }),
    client
      .from('despesas')
      .select('id, fornecedor_id, valor_centavos, valor_estimado_centavos')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .not('fornecedor_id', 'is', null),
    client
      .from('parcelas_despesa')
      .select('despesa_id, valor_centavos, pago_em, vence_em')
      .eq('casamento_id', weddingId),
  ])

  if (fornecedoresResult.error) throw badRequestError(fornecedoresResult.error.message)
  if (despesasResult.error) throw badRequestError(despesasResult.error.message)
  if (parcelasResult.error) throw badRequestError(parcelasResult.error.message)

  const parcelasPorDespesa = new Map<
    string,
    Array<{ valor_centavos: number; pago_em: string | null; vence_em: string }>
  >()
  for (const parcela of parcelasResult.data ?? []) {
    const lista = parcelasPorDespesa.get(parcela.despesa_id) ?? []
    lista.push(parcela)
    parcelasPorDespesa.set(parcela.despesa_id, lista)
  }

  const despesasPorFornecedor = new Map<
    string,
    Array<{
      valor_estimado_centavos: number | null
      valor_centavos: number | null
      parcelas: Array<{ valor_centavos: number; pago_em: string | null; vence_em: string }>
    }>
  >()
  for (const despesa of despesasResult.data ?? []) {
    if (!despesa.fornecedor_id) continue
    const lista = despesasPorFornecedor.get(despesa.fornecedor_id) ?? []
    lista.push({
      valor_estimado_centavos: despesa.valor_estimado_centavos,
      valor_centavos: despesa.valor_centavos,
      parcelas: parcelasPorDespesa.get(despesa.id) ?? [],
    })
    despesasPorFornecedor.set(despesa.fornecedor_id, lista)
  }

  const data: FornecedorComSituacao[] = (fornecedoresResult.data ?? []).map((linha) => {
    const { categoria, ...fornecedor } = linha
    const despesas = despesasPorFornecedor.get(fornecedor.id) ?? []

    return {
      ...fornecedor,
      categoria: categoria ?? null,
      situacaoFinanceira: situacaoFinanceiraFornecedor(despesas),
      contratadoCentavos: despesas.reduce(
        (total, despesa) => total + (despesa.valor_centavos ?? 0),
        0,
      ),
      aPagarCentavos: despesas.reduce(
        (total, despesa) => total + totaisDaDespesa(despesa).aPagar,
        0,
      ),
      totalDespesas: despesas.length,
    }
  })

  return { data }
})
