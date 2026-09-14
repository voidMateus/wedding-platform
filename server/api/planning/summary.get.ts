import { serverSupabaseClient } from '#supabase/server'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import { destaqueDoPlanejamento, resumoDoPlanejamento } from '#shared/utils/planejamento'
import type { ResumoPlanejamento } from '~/types/planning'

/**
 * Os números do bloco do painel — e só o destaque que ele exibe.
 *
 * Devolve a decisão pronta (`destaque`) em vez de deixar a tela escolher: o
 * painel mostra UM número por módulo, e essa regra vale para quem consome, não
 * para quem desenha. É o mesmo desenho do `atencao` do Financeiro.
 *
 * Só as duas colunas do cálculo: o painel não precisa da lista, e trazer
 * cinquenta linhas inteiras para contar três números é o tipo de excesso que
 * ninguém nota até a lista crescer.
 */
export default defineEventHandler(async (event): Promise<ResumoPlanejamento> => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('tarefas')
    .select('prazo, concluida_em')
    .eq('casamento_id', weddingId)

  if (error) {
    throw badRequestError(error.message)
  }

  const hoje = hojeNoFusoDoEvento()
  const resumo = resumoDoPlanejamento(data ?? [], hoje)

  return { ...resumo, destaque: destaqueDoPlanejamento(resumo), hoje }
})
