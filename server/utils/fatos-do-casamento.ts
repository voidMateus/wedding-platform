import type { SupabaseClient } from '@supabase/supabase-js'
import type { FatoObservado } from '#shared/fatos-do-casamento'
import type { Database } from '~/types/database.types'

/**
 * O que o sistema já sabe sobre este casamento — e que por isso não precisa
 * sugerir.
 *
 * Estes fatos decidem **o que oferecer**, NUNCA **o que está feito**
 * (docs/fase3-planejamento.md seção 1.1). Nenhuma tarefa é concluída a partir
 * daqui: o pior que um fato observado faz é deixar de mostrar uma sugestão que
 * o casal pode buscar em "ver todas".
 *
 * Tudo é contagem barata e tudo roda em paralelo — a lista inteira é uma ida
 * ao banco, não onze idas em série.
 */
export async function observarFatosDoCasamento(
  client: SupabaseClient<Database>,
  weddingId: string,
): Promise<{ fatos: FatoObservado[]; dataEvento: string | null }> {
  // Só as tabelas cuja contagem não tem recorte próprio: `convidados` fica de
  // fora porque precisa filtrar o rascunho da lista, e o tipo do helper
  // estreita as colunas ao que as quatro têm em comum.
  const contar = (tabela: 'presentes' | 'mesas' | 'etapas_evento') =>
    client.from(tabela).select('id', { count: 'exact', head: true }).eq('casamento_id', weddingId)

  const [
    casamento,
    convidados,
    etapas,
    etapasComLocal,
    comunicacoes,
    respostas,
    presentes,
    mesas,
    contratados,
  ] = await Promise.all([
    client
      .from('casamentos')
      .select(
        'data_evento, horario_evento, prazo_rsvp, orcamento_total_centavos, status_ciclo_vida, config_tema',
      )
      .eq('id', weddingId)
      .single(),
    // Rascunho da lista nunca conta (CLAUDE.md seção 12): uma pessoa "em
    // consideração" não faz a sugestão de montar a lista desaparecer.
    client
      .from('convidados')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .eq('em_consideracao', false),
    contar('etapas_evento'),
    contar('etapas_evento').not('nome_local', 'is', null),
    client.from('comunicacoes').select('tipo').eq('casamento_id', weddingId),
    client
      .from('respostas_rsvp')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', weddingId)
      .neq('status_rsvp', 'pendente'),
    contar('presentes').is('excluido_em', null),
    contar('mesas'),
    // "Contratado" é ter valor FECHADO — `valor_centavos` não nulo. Gasto só
    // estimado é planejamento, e planejar o buffet não é tê-lo contratado.
    client
      .from('despesas')
      .select('categoria_id, categorias_orcamento(nome)')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .not('valor_centavos', 'is', null),
  ])

  const fatos: FatoObservado[] = []

  if ((casamento.data?.orcamento_total_centavos ?? 0) > 0) fatos.push('orcamento_definido')
  if (casamento.data?.status_ciclo_vida === 'publicado') fatos.push('site_publicado')
  if (casamento.data?.horario_evento) fatos.push('horario_definido')
  if (casamento.data?.prazo_rsvp) fatos.push('prazo_rsvp_definido')
  // "O casal mexeu na aparência" não tem marca exata, e esta é a melhor
  // aproximação: presetId é gravado ao aplicar um preset e vira 'custom' em
  // qualquer edição manual, e a foto de capa é o gesto de quem foi direto ao
  // que mais muda a cara do site. O pior caso é oferecer um passo já
  // resolvido, que custa um clique para conferir.
  if (temIdentidadeVisual(casamento.data?.config_tema)) fatos.push('identidade_visual_definida')
  if ((convidados.count ?? 0) > 0) fatos.push('tem_convidado')
  if ((etapasComLocal.count ?? 0) > 0) fatos.push('local_definido')
  // Duas etapas é o que faz um cronograma: uma só é "onde é a festa", que a
  // sugestão de definir o local já cobre.
  if ((etapas.count ?? 0) >= 2) fatos.push('tem_cronograma')
  if ((respostas.count ?? 0) > 0) fatos.push('tem_resposta_rsvp')
  if ((presentes.count ?? 0) > 0) fatos.push('tem_presente')
  if ((mesas.count ?? 0) > 0) fatos.push('tem_mesa')

  const tipos = new Set((comunicacoes.data ?? []).map((linha) => linha.tipo))
  if (tipos.has('save_the_date')) fatos.push('tem_save_the_date')
  if (tipos.has('convite')) fatos.push('tem_convite_enviado')

  for (const despesa of contratados.data ?? []) {
    // O join devolve objeto ou array conforme a cardinalidade que o PostgREST
    // infere; normalizar aqui evita que a forma da resposta vire regra.
    const categoria = despesa.categorias_orcamento
    const nome = Array.isArray(categoria) ? categoria[0]?.nome : categoria?.nome
    if (nome) fatos.push(`contratado:${nome}`)
  }

  return { fatos, dataEvento: casamento.data?.data_evento ?? null }
}

function temIdentidadeVisual(configTema: unknown): boolean {
  if (!configTema || typeof configTema !== 'object') return false
  const tema = configTema as { presetId?: unknown; coverImageUrl?: unknown }
  return Boolean(tema.presetId) || Boolean(tema.coverImageUrl)
}
