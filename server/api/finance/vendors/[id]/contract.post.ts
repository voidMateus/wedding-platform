import { serverSupabaseClient } from '#supabase/server'
import { vendorContractSchema } from '#shared/schemas/finance'
import { gerarParcelas } from '#shared/utils/orcamento'

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
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Fornecedor não informado.')
  }

  const input = await validateBody(event, vendorContractSchema)
  const client = await serverSupabaseClient(event)

  const [fornecedorResult, despesaResult] = await Promise.all([
    client
      .from('fornecedores')
      .select('id, nome, categoria_id')
      .eq('id', id)
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .maybeSingle(),
    client
      .from('despesas')
      .select('id, descricao, categoria_id, valor_centavos')
      .eq('id', input.despesaId)
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .maybeSingle(),
  ])

  if (fornecedorResult.error) throw badRequestError(fornecedorResult.error.message)
  if (despesaResult.error) throw badRequestError(despesaResult.error.message)
  if (!fornecedorResult.data) throw notFoundError('Fornecedor não encontrado.')
  if (!despesaResult.data) throw notFoundError('Gasto não encontrado.')

  const { data: despesa, error: erroDespesa } = await client
    .from('despesas')
    .update({
      valor_centavos: input.valorCentavos,
      fornecedor_id: fornecedorResult.data.id,
      // A categoria do fornecedor só é adotada quando o gasto não tinha uma:
      // o casal classificou o gasto no planejamento, e contratar não é hora de
      // remanejar o orçamento por baixo dele.
      categoria_id: despesaResult.data.categoria_id ?? fornecedorResult.data.categoria_id,
    })
    .eq('id', input.despesaId)
    .eq('casamento_id', weddingId)
    .select()
    .single()

  if (erroDespesa) {
    throw badRequestError(erroDespesa.message)
  }

  // O vínculo é gravado nos DOIS sentidos. Só `despesas.fornecedor_id` deixava
  // a cotação contratada órfã na tela de Fornecedores — ela caía em "Sem gasto
  // definido" enquanto Pagamentos já mostrava o nome dela no gasto, e as duas
  // telas descreviam realidades diferentes do mesmo contrato.
  const { error: erroFornecedor } = await client
    .from('fornecedores')
    .update({ estagio: 'contratado', despesa_id: input.despesaId })
    .eq('id', id)
    .eq('casamento_id', weddingId)

  if (erroFornecedor) {
    throw badRequestError(erroFornecedor.message)
  }

  if (input.parcelamento && input.parcelamento.modo !== 'depois') {
    const parcelas =
      input.parcelamento.modo === 'a_vista'
        ? gerarParcelas(input.valorCentavos, 1, input.parcelamento.venceEm)
        : gerarParcelas(
            input.valorCentavos,
            input.parcelamento.quantidade,
            input.parcelamento.primeiroVencimento,
          )

    // Substitui o que estava em aberto: contratar de novo o mesmo gasto é
    // renegociação, e a parcela antiga descreveria um acordo que não existe
    // mais. Parcela paga nunca é tocada — é fato registrado.
    const { data: emAberto } = await client
      .from('parcelas_despesa')
      .select('id')
      .eq('despesa_id', input.despesaId)
      .is('pago_em', null)

    if (emAberto && emAberto.length > 0) {
      await client
        .from('parcelas_despesa')
        .delete()
        .in(
          'id',
          emAberto.map((parcela) => parcela.id),
        )
    }

    const { data: pagas } = await client
      .from('parcelas_despesa')
      .select('numero')
      .eq('despesa_id', input.despesaId)

    const maiorNumero = (pagas ?? []).reduce((maior, p) => Math.max(maior, p.numero), 0)

    const { error: erroParcelas } = await client.from('parcelas_despesa').insert(
      parcelas.map((parcela) => ({
        casamento_id: weddingId,
        despesa_id: input.despesaId,
        numero: maiorNumero + parcela.numero,
        vence_em: parcela.vence_em,
        valor_centavos: parcela.valor_centavos,
      })),
    )

    if (erroParcelas) {
      throw badRequestError(erroParcelas.message)
    }
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.vendor.contract',
    entityType: 'vendor',
    entityId: id,
    metadata: {
      despesaId: input.despesaId,
      valorCentavos: input.valorCentavos,
      fornecedor: fornecedorResult.data.nome,
    },
  })

  return despesa
})
