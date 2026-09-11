import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import {
  hojeNoFusoDoEvento,
  situacaoDaParcela,
  somarDias,
  DIAS_HORIZONTE_VENCIMENTO,
} from '#shared/utils/orcamento'
import type { PagamentoListado, ResumoDePagamentos } from '~/types/finance'

const querySchema = z.object({
  /** `todos` (default), `pagos`, `pendentes` ou `vencidos` — o recorte da tela. */
  filtro: z.enum(['todos', 'pagos', 'pendentes', 'vencidos']).default('todos'),
})

/**
 * A vida financeira do casamento: cada parcela de cada gasto CONTRATADO, com o
 * contexto que a torna reconhecível (o gasto, a categoria, o fornecedor).
 *
 * Gasto ainda em planejamento não aparece aqui — não há o que pagar num valor
 * que ninguém fechou. É a separação que esta tela existe para manter: Orçamento
 * responde "quanto vai custar", Pagamentos responde "quanto sai, e quando".
 *
 * A situação de cada parcela é derivada de `pago_em` e `vence_em` contra hoje
 * no fuso do evento — nunca uma coluna de status.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { filtro } = validateQuery(event, querySchema)
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('parcelas_despesa')
    .select(
      `*, despesa:despesas!inner (
        id, descricao, valor_centavos, excluido_em,
        categoria:categorias_orcamento (id, nome),
        fornecedor:fornecedores (id, nome)
      )`,
    )
    .eq('casamento_id', weddingId)
    .is('despesa.excluido_em', null)
    .order('vence_em', { ascending: true })

  if (error) {
    throw badRequestError(error.message)
  }

  const hoje = hojeNoFusoDoEvento()
  const limite = somarDias(hoje, DIAS_HORIZONTE_VENCIMENTO)

  const pagamentos: PagamentoListado[] = (data ?? []).map((linha) => {
    const { despesa, ...parcela } = linha
    return {
      ...parcela,
      situacao: situacaoDaParcela(parcela, hoje),
      despesa: { id: despesa.id, descricao: despesa.descricao },
      categoria: despesa.categoria ?? null,
      fornecedor: despesa.fornecedor ?? null,
    }
  })

  // O resumo é sempre do conjunto INTEIRO, não do recorte: o número de
  // vencidos não pode mudar porque o casal filtrou por "pagos".
  const resumo: ResumoDePagamentos = {
    pago: { valor: 0, quantidade: 0 },
    vencidos: { valor: 0, quantidade: 0 },
    proximos30Dias: { valor: 0, quantidade: 0 },
    aPagar: { valor: 0, quantidade: 0 },
  }

  for (const pagamento of pagamentos) {
    if (pagamento.situacao === 'paga') {
      resumo.pago.valor += pagamento.valor_centavos
      resumo.pago.quantidade += 1
      continue
    }

    resumo.aPagar.valor += pagamento.valor_centavos
    resumo.aPagar.quantidade += 1

    if (pagamento.situacao === 'vencida') {
      resumo.vencidos.valor += pagamento.valor_centavos
      resumo.vencidos.quantidade += 1
    } else if (pagamento.vence_em <= limite) {
      resumo.proximos30Dias.valor += pagamento.valor_centavos
      resumo.proximos30Dias.quantidade += 1
    }
  }

  const recortados = pagamentos.filter((pagamento) => {
    if (filtro === 'pagos') return pagamento.situacao === 'paga'
    if (filtro === 'pendentes') return pagamento.situacao !== 'paga'
    if (filtro === 'vencidos') return pagamento.situacao === 'vencida'
    return true
  })

  return { data: recortados, resumo, hoje }
})
