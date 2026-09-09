import { serverSupabaseClient } from '#supabase/server'
import { FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA } from '#shared/utils/faixa-etaria'

/**
 * Os números da lista INTEIRA — o que o cabeçalho de Convidados anuncia nas
 * duas visões (organizada e Modo lista).
 *
 * Endpoint próprio, e não campos a mais no `summary` de `GET /api/guests`, por
 * duas razões:
 *
 * 1. **Semântica.** O `summary` descreve o *recorte* que está na tela; estes
 *    números descrevem o casamento. Misturar os dois no mesmo objeto faria
 *    "142 convidados" mudar quando um filtro fosse aplicado, que é exatamente
 *    o que o cabeçalho não deve fazer.
 * 2. **Custo.** São seis contagens; presas à listagem, seriam refeitas a cada
 *    tecla do filtro. Aqui a tela busca uma vez e as duas visões compartilham
 *    a mesma resposta.
 *
 * A classificação etária é resolvida no banco, como intervalo de datas de
 * nascimento (`buildAgeGroupFilter`) — nunca em memória, porque a listagem é
 * paginada e a Visão organizada nunca tem a lista inteira na mão.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)
  const contexto = await loadAgeGroupContext(client, weddingId)

  /** Base comum: convidados de verdade deste casamento. Rascunho nunca conta. */
  function base() {
    return client
      .from('convidados_com_status')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .eq('em_consideracao', false)
  }

  const chaves = [...FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_NAO_INFORMADA]

  const [totalResult, rascunhoResult, ...faixaResults] = await Promise.all([
    base(),
    client
      .from('convidados_com_status')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .eq('em_consideracao', true),
    ...chaves.map((chave) => base().or(buildAgeGroupFilter(chave, contexto))),
  ])

  if (totalResult.error) throw badRequestError(totalResult.error.message)
  if (rascunhoResult.error) throw badRequestError(rascunhoResult.error.message)
  for (const resultado of faixaResults) {
    if (resultado.error) throw badRequestError(resultado.error.message)
  }

  return {
    total: totalResult.count ?? 0,
    emConsideracao: rascunhoResult.count ?? 0,
    faixas: chaves.map((chave, indice) => ({
      chave,
      total: faixaResults[indice]?.count ?? 0,
    })),
  }
})
