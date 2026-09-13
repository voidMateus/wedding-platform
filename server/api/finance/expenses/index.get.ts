import { serverSupabaseClient } from '#supabase/server'

/**
 * A árvore do Orçamento: categorias (com os quatro estágios no recorte delas),
 * as despesas de cada uma e as parcelas de cada despesa.
 *
 * Não paginada por decisão registrada (docs/fase1-financeiro.md, seção 5) — um
 * casamento tem dezenas de despesas, e paginar faria filtro e total
 * descreverem listas diferentes.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const orcamento = await carregarOrcamento(client, weddingId)

  return {
    categorias: orcamento.categorias,
    tetoCentavos: orcamento.tetoCentavos,
    vazio: orcamento.vazio,
  }
})
