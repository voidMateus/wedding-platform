import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { situacaoFinanceiraFornecedor, totaisDaDespesa } from '#shared/utils/orcamento'
import type { FornecedorComSituacao } from '~/types/finance'

const querySchema = z.object({
  /** `?incluirArquivados=1` traz também os arquivados, para a seção de restauração. */
  incluirArquivados: z.string().optional(),
})

/**
 * Fornecedores com o gasto que cada um cota e a situação financeira DERIVADA
 * das despesas ligadas a ele (sem despesa / a pagar / quitado).
 *
 * "Pago" não é estágio de negociação: o fornecedor contratado cujas parcelas
 * acabaram está quitado sem ninguém marcar nada, e o que tem saldo continua "a
 * pagar" mesmo que alguém tenha esquecido de mexer no pipeline.
 *
 * A contagem de documentos vem junto porque é o que separa, na comparação de
 * propostas, quem mandou PDF de quem falou um preço por telefone.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { incluirArquivados } = validateQuery(event, querySchema)
  const client = await serverSupabaseClient(event)

  let fornecedoresQuery = client
    .from('fornecedores')
    .select(
      '*, categoria:categorias_orcamento (id, nome), gasto:despesas!fornecedores_despesa_id_fkey (id, descricao, categoria_id)',
    )
    .eq('casamento_id', weddingId)
    .order('nome', { ascending: true })

  if (!incluirArquivados) {
    fornecedoresQuery = fornecedoresQuery.is('excluido_em', null)
  }

  const [fornecedoresResult, despesasResult, parcelasResult, documentosResult] = await Promise.all([
    fornecedoresQuery,
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
    client
      .from('documentos')
      .select('fornecedor_id')
      .eq('casamento_id', weddingId)
      .not('fornecedor_id', 'is', null),
  ])

  if (fornecedoresResult.error) throw badRequestError(fornecedoresResult.error.message)
  if (despesasResult.error) throw badRequestError(despesasResult.error.message)
  if (parcelasResult.error) throw badRequestError(parcelasResult.error.message)
  if (documentosResult.error) throw badRequestError(documentosResult.error.message)

  type ParcelaSimples = { valor_centavos: number; pago_em: string | null; vence_em: string }
  type DespesaSimples = {
    valor_estimado_centavos: number | null
    valor_centavos: number | null
    parcelas: ParcelaSimples[]
  }

  const parcelasPorDespesa = new Map<string, ParcelaSimples[]>()
  for (const parcela of parcelasResult.data ?? []) {
    const lista = parcelasPorDespesa.get(parcela.despesa_id) ?? []
    lista.push(parcela)
    parcelasPorDespesa.set(parcela.despesa_id, lista)
  }

  const despesasPorFornecedor = new Map<string, DespesaSimples[]>()
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

  const documentosPorFornecedor = new Map<string, number>()
  for (const documento of documentosResult.data ?? []) {
    if (!documento.fornecedor_id) continue
    documentosPorFornecedor.set(
      documento.fornecedor_id,
      (documentosPorFornecedor.get(documento.fornecedor_id) ?? 0) + 1,
    )
  }

  const data: FornecedorComSituacao[] = (fornecedoresResult.data ?? []).map((linha) => {
    const { categoria, gasto, ...fornecedor } = linha
    const despesas = despesasPorFornecedor.get(fornecedor.id) ?? []

    return {
      ...fornecedor,
      categoria: categoria ?? null,
      gasto: gasto ? { id: gasto.id, descricao: gasto.descricao } : null,
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
      totalDocumentos: documentosPorFornecedor.get(fornecedor.id) ?? 0,
    }
  })

  return { data }
})
