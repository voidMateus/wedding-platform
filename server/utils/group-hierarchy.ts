import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * Apoio à hierarquia de grupos de dois níveis (`grupos.grupo_pai_id`,
 * migration 20260908090001). Mora em `server/utils` porque as duas
 * responsabilidades abaixo são compartilhadas por vários endpoints e nenhuma
 * delas é decisão de tela.
 */

type Client = SupabaseClient<Database>

/**
 * Traduz as exceções de `validar_grupo_pai()` para mensagem em português.
 *
 * O trigger levanta código de erro genérico (`check_violation`), então a
 * mensagem crua chegaria ao casal como "GRUPO_PAI_JA_E_SUBGRUPO". Devolve
 * `null` quando o erro não é da hierarquia — aí quem chamou repassa o original,
 * em vez de mascarar um problema diferente com uma mensagem tranquilizadora.
 */
export function traduzirErroHierarquiaGrupo(message: string): string | null {
  if (message.includes('GRUPO_PAI_JA_E_SUBGRUPO')) {
    return 'Este grupo já é uma subdivisão. A lista tem no máximo dois níveis: grupo e subdivisão.'
  }
  if (message.includes('GRUPO_COM_SUBGRUPOS')) {
    return 'Este grupo tem subdivisões, então não pode virar subdivisão de outro. Mova ou remova as subdivisões primeiro.'
  }
  if (message.includes('GRUPO_PAI_CIRCULAR')) {
    return 'Um grupo não pode ser subdivisão de si mesmo.'
  }
  if (message.includes('GRUPO_PAI_ARQUIVADO')) {
    return 'O grupo escolhido está arquivado. Desarquive-o antes de criar subdivisões nele.'
  }
  if (message.includes('GRUPO_PAI_NAO_ENCONTRADO')) {
    return 'Grupo escolhido não encontrado.'
  }
  return null
}

/**
 * Expande uma seleção de grupos para incluir as subdivisões de cada um.
 *
 * Filtrar a lista por "Família do Mateus" precisa trazer também quem está em
 * "Tios paternos": o convidado aponta para a folha (`convidados.grupo_id`), e
 * ninguém fica pendurado no grupo-pai só por existir a subdivisão. Sem esta
 * expansão o filtro do grupo-pai devolveria quase nada — e pior, um número
 * plausível, sem nada acusando a falta.
 *
 * Subdivisão selecionada continua valendo por si: expandir é sempre aditivo.
 */
export async function expandirGruposComSubdivisoes(
  client: Client,
  weddingId: string,
  groupIds: string[],
): Promise<string[]> {
  if (!groupIds.length) return groupIds

  const { data, error } = await client
    .from('grupos')
    .select('id')
    .eq('casamento_id', weddingId)
    .in('grupo_pai_id', groupIds)

  if (error) {
    throw badRequestError(error.message)
  }

  const expandido = new Set(groupIds)
  for (const subgrupo of data ?? []) {
    expandido.add(subgrupo.id)
  }
  return [...expandido]
}
