import { serverSupabaseClient } from '#supabase/server'
import { expenseInputSchema } from '#shared/schemas/finance'
import { gerarParcelasComEntrada } from '#shared/utils/orcamento'

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
      valor_estimado_centavos: input.valorEstimadoCentavos ?? null,
      // Nulo enquanto o gasto é só planejamento: é o preenchimento desta
      // coluna que o transforma em compromisso.
      valor_centavos: input.valorCentavos ?? null,
      observacao: input.observacao ?? null,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  // Só se parcela o que já tem valor fechado — parcelar uma estimativa seria
  // agendar a saída de um dinheiro que ninguém se comprometeu a pagar.
  const parcelamento = input.parcelamento
  if (input.valorCentavos && parcelamento && parcelamento.modo !== 'depois') {
    // Entrada e forma do saldo são duas perguntas, não uma: dar entrada é a
    // maneira normal de contratar fornecedor de casamento, e antes só existia
    // "parcelas iguais" — quem segurava a data com um sinal criava as linhas
    // à mão, uma a uma.
    const parcelas = gerarParcelasComEntrada(
      input.valorCentavos,
      parcelamento.entrada ?? null,
      parcelamento.modo === 'a_vista'
        ? { quantidade: 1, primeiroVencimento: parcelamento.venceEm }
        : {
            quantidade: parcelamento.quantidade,
            primeiroVencimento: parcelamento.primeiroVencimento,
          },
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
    metadata: {
      descricao: despesa.descricao,
      valorEstimadoCentavos: despesa.valor_estimado_centavos,
      valorCentavos: despesa.valor_centavos,
    },
  })

  setResponseStatus(event, 201)
  return despesa
})
