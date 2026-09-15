import { serverSupabaseUser } from '#supabase/server'

/**
 * Exclui um casamento pelo painel interno (docs/fase5-multievento.md 6.6).
 *
 * É a ação mais destrutiva do produto: as 34 FKs que apontam para `casamentos`
 * têm `on delete cascade`, então a linha leva junto convidados, convites,
 * respostas de RSVP, presentes, pagamentos, mesas e documentos. Não há
 * desfazer.
 *
 * auditoria em transação: o registro NÃO vai para `trilha_auditoria` — ela
 * cascateia com o casamento, e um registro que morre junto com o que descreve
 * não é registro. `excluir_casamento()` fotografa slug, nomes, data, status e
 * porte em `exclusoes_de_casamento` e só então apaga, na mesma transação.
 *
 * ## A ordem, de novo: o resíduo fica do lado barato
 *
 * Os arquivos de storage não estão no grafo de relações do banco, então saem
 * por fora. Primeiro o banco, depois os arquivos — nunca o contrário: se a
 * exclusão falhasse depois de os arquivos terem ido, sobraria um casamento
 * vivo com as imagens quebradas. Nesta ordem, o pior caso é arquivo órfão, que
 * a própria métrica de storage mostra e que se apaga depois.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)

  const weddingId = getRouterParam(event, 'id')
  if (!weddingId) {
    throw badRequestError('id do casamento não informado.')
  }

  const admin = supabaseAdmin(event)

  const { data: registro, error } = await admin.rpc('excluir_casamento', {
    p_casamento_id: weddingId,
    p_operador: operador!.sub,
  })

  if (error) {
    if (error.code === 'P0002' || /não encontrado/.test(error.message)) {
      throw notFoundError('Casamento não encontrado.')
    }
    throw badRequestError(error.message)
  }

  // Os arquivos, agora que o tenant já não existe. Falha aqui não desfaz nada
  // e não derruba a resposta: vira arquivo órfão, que é resíduo barato e
  // visível — a métrica de storage continua somando o prefixo.
  //
  // A lista de buckets vem do banco, e não de uma constante daqui: ela já é a
  // fonte da métrica de storage, e uma segunda cópia se desencontraria dela
  // exatamente como `wedding-photos` se desencontrou da realidade.
  const { data: buckets } = await admin.rpc('buckets_contabilizados')

  for (const bucket of buckets ?? []) {
    const { data: arquivos } = await admin.storage.from(bucket).list(weddingId)
    if (!arquivos?.length) continue

    const caminhos = arquivos.map((arquivo) => `${weddingId}/${arquivo.name}`)
    const { error: removeError } = await admin.storage.from(bucket).remove(caminhos)
    if (removeError) {
      console.error('[plataforma] falha ao remover arquivos de', bucket, removeError.message)
    }
  }

  return { data: registro }
})
