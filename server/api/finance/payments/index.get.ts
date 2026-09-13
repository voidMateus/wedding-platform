import { serverSupabaseClient } from '#supabase/server'
import {
  hojeNoFusoDoEvento,
  situacaoDaParcela,
  somarDias,
  totaisDaDespesa,
  DIAS_HORIZONTE_VENCIMENTO,
} from '#shared/utils/orcamento'
import type { PagamentoListado, ResumoDePagamentos } from '~/types/finance'

/**
 * A vida financeira do casamento: tudo que já virou compromisso.
 *
 * **Contratar é o que põe o gasto aqui — não ter parcela definida não o
 * esconde.** Quem fechou com o buffet e escolheu "defino o pagamento depois"
 * precisa encontrar esse compromisso nesta tela, com o saldo pendente e o
 * caminho para agendar; sumir daqui até alguém lembrar de criar parcelas era o
 * furo mais fácil de virar uma conta esquecida.
 *
 * Por isso a lista tem dois tipos de linha:
 *   - a parcela de verdade, com vencimento e estado derivado de `pago_em`;
 *   - o compromisso **sem parcelas**, uma linha por gasto contratado, com a
 *     situação `a_definir` e o saldo inteiro em aberto.
 *
 * Gasto ainda em planejamento (sem custo final) não aparece de jeito nenhum:
 * não há o que pagar num valor que ninguém fechou.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [despesasResult, parcelasResult] = await Promise.all([
    client
      .from('despesas')
      .select(
        '*, categoria:categorias_orcamento (id, nome, cor_indice, cor_personalizada), fornecedor:fornecedores!despesas_fornecedor_id_fkey (id, nome)',
      )
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .not('valor_centavos', 'is', null),
    client
      .from('parcelas_despesa')
      .select('*')
      .eq('casamento_id', weddingId)
      .order('vence_em', { ascending: true }),
  ])

  if (despesasResult.error) throw badRequestError(despesasResult.error.message)
  if (parcelasResult.error) throw badRequestError(parcelasResult.error.message)

  const hoje = hojeNoFusoDoEvento()
  const limite = somarDias(hoje, DIAS_HORIZONTE_VENCIMENTO)

  const parcelas = parcelasResult.data ?? []
  const parcelasPorDespesa = new Map<string, typeof parcelas>()
  for (const parcela of parcelas) {
    const lista = parcelasPorDespesa.get(parcela.despesa_id) ?? []
    lista.push(parcela)
    parcelasPorDespesa.set(parcela.despesa_id, lista)
  }

  const pagamentos: PagamentoListado[] = []

  for (const linha of despesasResult.data ?? []) {
    const { categoria, fornecedor, ...despesa } = linha
    const doGasto = parcelasPorDespesa.get(despesa.id) ?? []
    const contexto = {
      despesa: { id: despesa.id, descricao: despesa.descricao },
      categoria: categoria ?? null,
      fornecedor: fornecedor ?? null,
    }

    for (const parcela of doGasto) {
      pagamentos.push({
        ...parcela,
        tipo: 'parcela',
        situacao: situacaoDaParcela(parcela, hoje),
        totalDeParcelas: doGasto.length,
        ...contexto,
      })
    }

    // O saldo que sobra do contrato sem estar em nenhuma parcela vira UMA
    // linha "a definir" — inclusive quando não há parcela alguma.
    const totais = totaisDaDespesa({
      valor_estimado_centavos: despesa.valor_estimado_centavos,
      valor_centavos: despesa.valor_centavos,
      parcelas: doGasto,
    })

    if (totais.naoParcelado > 0) {
      pagamentos.push({
        id: `despesa:${despesa.id}`,
        casamento_id: despesa.casamento_id,
        despesa_id: despesa.id,
        numero: doGasto.length + 1,
        vence_em: null,
        valor_centavos: totais.naoParcelado,
        pago_em: null,
        forma_pagamento: null,
        observacao: null,
        created_at: despesa.created_at,
        updated_at: despesa.updated_at,
        tipo: 'a_definir',
        situacao: 'a_definir',
        totalDeParcelas: doGasto.length,
        ...contexto,
      })
    }
  }

  // Sem vencimento definido, o compromisso vai para o fim: ele não disputa
  // urgência com quem tem data marcada.
  pagamentos.sort((a, b) => (a.vence_em ?? '9999-12-31').localeCompare(b.vence_em ?? '9999-12-31'))

  const resumo: ResumoDePagamentos = {
    pago: { valor: 0, quantidade: 0 },
    vencidos: { valor: 0, quantidade: 0 },
    proximos30Dias: { valor: 0, quantidade: 0 },
    aPagar: { valor: 0, quantidade: 0 },
    semData: { valor: 0, quantidade: 0 },
  }

  for (const pagamento of pagamentos) {
    if (pagamento.situacao === 'paga') {
      resumo.pago.valor += pagamento.valor_centavos
      resumo.pago.quantidade += 1
      continue
    }

    resumo.aPagar.valor += pagamento.valor_centavos
    resumo.aPagar.quantidade += 1

    if (pagamento.situacao === 'a_definir') {
      resumo.semData.valor += pagamento.valor_centavos
      resumo.semData.quantidade += 1
    } else if (pagamento.situacao === 'vencida') {
      resumo.vencidos.valor += pagamento.valor_centavos
      resumo.vencidos.quantidade += 1
    } else if (pagamento.vence_em && pagamento.vence_em <= limite) {
      resumo.proximos30Dias.valor += pagamento.valor_centavos
      resumo.proximos30Dias.quantidade += 1
    }
  }

  return { data: pagamentos, resumo, hoje }
})
