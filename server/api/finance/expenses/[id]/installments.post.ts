import { serverSupabaseClient } from '#supabase/server'
import { installmentsGenerateSchema } from '#shared/schemas/finance'
import { gerarParcelasComEntrada, totaisDaDespesa } from '#shared/utils/orcamento'

/**
 * Gera parcelas para uma despesa que já existe — o caminho de quem escolheu
 * "defino depois" na criação, ou de quem renegociou o pagamento.
 *
 * O valor parcelado é o SALDO da despesa (valor − pago), não o valor cheio:
 * gerar 3x sobre R$ 20.000 quando R$ 5.000 já foram pagos criaria um
 * parcelamento que soma R$ 25.000 de compromisso.
 *
 * `substituirEmAberto` apaga as parcelas não pagas antes de criar as novas —
 * é a renegociação. Parcela paga nunca é tocada: ela é um fato registrado.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Despesa não informada.')
  }

  const input = await validateBody(event, installmentsGenerateSchema)
  if (input.parcelamento.modo === 'depois') {
    throw badRequestError('Escolha à vista ou parcelado para gerar as parcelas.')
  }

  const client = await serverSupabaseClient(event)

  const { data: despesa, error: despesaError } = await client
    .from('despesas')
    .select('id, valor_centavos, valor_estimado_centavos')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .maybeSingle()

  if (despesaError) {
    throw badRequestError(despesaError.message)
  }
  if (!despesa) {
    throw notFoundError('Despesa não encontrada.')
  }
  // Parcelar exige contrato: agendar a saída de um valor só estimado colocaria
  // em Pagamentos um dinheiro que ninguém se comprometeu a pagar.
  if (despesa.valor_centavos === null) {
    throw badRequestError('Informe o valor fechado deste gasto antes de parcelar.')
  }

  const { data: existentes, error: parcelasError } = await client
    .from('parcelas_despesa')
    .select('*')
    .eq('despesa_id', despesa.id)

  if (parcelasError) {
    throw badRequestError(parcelasError.message)
  }

  const parcelasAtuais = existentes ?? []

  if (input.substituirEmAberto) {
    const emAberto = parcelasAtuais.filter((parcela) => !parcela.pago_em)
    if (emAberto.length > 0) {
      const { error: remocaoError } = await client
        .from('parcelas_despesa')
        .delete()
        .in(
          'id',
          emAberto.map((parcela) => parcela.id),
        )

      if (remocaoError) {
        throw badRequestError(remocaoError.message)
      }
    }
  }

  const mantidas = input.substituirEmAberto
    ? parcelasAtuais.filter((parcela) => parcela.pago_em)
    : parcelasAtuais

  const totais = totaisDaDespesa({
    valor_estimado_centavos: despesa.valor_estimado_centavos,
    valor_centavos: despesa.valor_centavos,
    parcelas: mantidas,
  })

  const saldo = input.substituirEmAberto ? totais.aPagar : totais.naoParcelado
  if (saldo <= 0) {
    throw badRequestError('Esta despesa já está totalmente parcelada.')
  }

  // A entrada aqui sai do SALDO ainda não parcelado, não do valor do contrato:
  // agendar o que sobrou de um gasto já meio parcelado é caso normal, e usar o
  // total faria a entrada comer parcela que já existe.
  const novas = gerarParcelasComEntrada(
    saldo,
    input.parcelamento.entrada ?? null,
    input.parcelamento.modo === 'a_vista'
      ? { quantidade: 1, primeiroVencimento: input.parcelamento.venceEm }
      : {
          quantidade: input.parcelamento.quantidade,
          primeiroVencimento: input.parcelamento.primeiroVencimento,
        },
  )

  // Continua a numeração existente em vez de reiniciar: o índice único
  // (despesa_id, numero) recusaria, e "2 de 3" precisa continuar apontando
  // para a mesma parcela do contrato depois de uma renegociação.
  const maiorNumero = mantidas.reduce((maior, parcela) => Math.max(maior, parcela.numero), 0)

  const { data, error } = await client
    .from('parcelas_despesa')
    .insert(
      novas.map((parcela) => ({
        casamento_id: weddingId,
        despesa_id: despesa.id,
        numero: maiorNumero + parcela.numero,
        vence_em: parcela.vence_em,
        valor_centavos: parcela.valor_centavos,
      })),
    )
    .select()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.installments.generate',
    entityType: 'expense',
    entityId: despesa.id,
    metadata: { quantidade: data.length },
  })

  setResponseStatus(event, 201)
  return { data }
})
