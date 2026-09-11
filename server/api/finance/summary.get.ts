import { serverSupabaseClient } from '#supabase/server'
import { hojeNoFusoDoEvento, resumoDoOrcamento } from '#shared/utils/orcamento'
import type { ResumoFinanceiro } from '~/types/finance'

/**
 * O resumo da Visão geral: os quatro estágios do dinheiro, as duas distâncias
 * entre eles e o bloco de atenção (docs/fase1-financeiro.md, seções 1.1 e 7).
 *
 * Devolve a narrativa pronta, não linhas cruas — e campos derivados vêm `null`
 * quando não há base para calculá-los (planejado zero, teto ausente). É o
 * `null` que faz a tela omitir a linha em vez de exibir "0% contratado" para
 * quem nunca planejou nada.
 *
 * O cálculo mora em `shared/utils/orcamento.ts`, o mesmo que a tela usa: dois
 * lugares somando por conta própria é como o total do cabeçalho passa a
 * discordar da soma das linhas.
 */
export default defineEventHandler(async (event): Promise<ResumoFinanceiro> => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [orcamento, entradasPresentes] = await Promise.all([
    carregarOrcamento(client, weddingId),
    carregarEntradasDePresentes(client, weddingId),
  ])

  const resumo = resumoDoOrcamento(orcamento.grupos, {
    // Dia resolvido no fuso do evento, não no do servidor: em UTC, às 22h de
    // um sábado em São Paulo já é domingo, e uma parcela venceria um dia antes
    // da conta do casal.
    hoje: hojeNoFusoDoEvento(),
    tetoCentavos: orcamento.tetoCentavos,
  })

  return { ...resumo, entradasPresentes, vazio: orcamento.vazio }
})
