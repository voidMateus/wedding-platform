import { serverSupabaseClient } from '#supabase/server'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import type { TarefasResponse } from '~/types/planning'

/**
 * A checklist inteira, mais os fatos que dispensam sugestão.
 *
 * SEM PAGINAÇÃO, de propósito: o teto real são algumas dezenas de linhas, e
 * paginar quebraria o agrupamento por janela — que é a tela inteira. O recorte
 * aqui é o oposto do de Convites: lá a lista cresce com o casamento, aqui ela
 * é do tamanho do trabalho.
 *
 * `hoje` vem junto porque é ele que define as janelas, e resolvê-lo no
 * navegador faria a mesma tarefa aparecer vencida ou não conforme o relógio de
 * quem abre.
 */
export default defineEventHandler(async (event): Promise<TarefasResponse> => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [tarefas, observacao] = await Promise.all([
    client
      .from('tarefas')
      .select('*')
      .eq('casamento_id', weddingId)
      // Sem prazo por último dentro de cada bloco; o agrupamento é da tela, mas
      // a ordem estável é daqui.
      .order('prazo', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    observarFatosDoCasamento(client, weddingId),
  ])

  if (tarefas.error) {
    throw badRequestError(tarefas.error.message)
  }

  return {
    data: tarefas.data ?? [],
    fatos: observacao.fatos,
    dataEvento: observacao.dataEvento,
    hoje: hojeNoFusoDoEvento(),
  }
})
