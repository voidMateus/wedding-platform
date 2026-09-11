import { serverSupabaseClient } from '#supabase/server'
import { expenseInputSchema } from '#shared/schemas/finance'
import { gerarParcelas } from '#shared/utils/orcamento'

/**
 * Cria a despesa e, quando o casal escolheu como pagar, já gera as parcelas.
 *
 * São dois statements, não uma função Postgres: se o lote de parcelas falhar,
 * sobra uma despesa SEM parcelas — que é um estado válido do produto ("defino
 * depois") e corrigível na própria tela. Transação só se justifica onde o
 * estado intermediário seria inválido, que não é o caso.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, expenseInputSchema)

  const client = await serverSupabaseClient(event)

  const { data: despesa, error } = await client
    .from('despesas')
    .insert({
      casamento_id: weddingId,
      categoria_id: input.categoriaId ?? null,
      fornecedor_id: input.fornecedorId ?? null,
      descricao: input.descricao,
      valor_centavos: input.valorCentavos,
      observacao: input.observacao ?? null,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  const parcelamento = input.parcelamento
  if (parcelamento && parcelamento.modo !== 'depois') {
    const parcelas =
      parcelamento.modo === 'a_vista'
        ? gerarParcelas(input.valorCentavos, 1, parcelamento.venceEm)
        : gerarParcelas(
            input.valorCentavos,
            parcelamento.quantidade,
            parcelamento.primeiroVencimento,
          )

    if (parcelas.length > 0) {
      const { error: parcelasError } = await client.from('parcelas_despesa').insert(
        parcelas.map((parcela) => ({
          // O trigger deriva o casamento_id da própria despesa; mandar aqui é
          // só para satisfazer o tipo — o valor gravado é sempre o derivado.
          casamento_id: weddingId,
          despesa_id: despesa.id,
          numero: parcela.numero,
          vence_em: parcela.vence_em,
          valor_centavos: parcela.valor_centavos,
        })),
      )

      if (parcelasError) {
        throw badRequestError(parcelasError.message)
      }
    }
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.expense.create',
    entityType: 'expense',
    entityId: despesa.id,
    metadata: { descricao: despesa.descricao, valorCentavos: despesa.valor_centavos },
  })

  setResponseStatus(event, 201)
  return despesa
})
