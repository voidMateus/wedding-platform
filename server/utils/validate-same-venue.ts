import type { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

type SupabaseClient = Awaited<ReturnType<typeof serverSupabaseClient<Database>>>

/**
 * Valida o alvo de `mesmo_local_que` (CLAUDE.md, seção 12.2 — cerimônia e
 * recepção no mesmo local): precisa existir, pertencer ao mesmo casamento,
 * não ser o próprio segmento (auto-referência) e não ter, ele mesmo, um
 * `mesmo_local_que` definido — só um nível de indireção, nunca uma corrente.
 * Lança badRequestError quando inválido; não retorna nada quando ok.
 */
export async function validateSameVenueTarget(
  client: SupabaseClient,
  weddingId: string,
  sameVenueAs: string,
  currentSegmentId?: string,
): Promise<void> {
  if (currentSegmentId && sameVenueAs === currentSegmentId) {
    throw badRequestError('Um item do cronograma não pode usar o próprio local como referência.')
  }

  const { data: target, error } = await client
    .from('etapas_evento')
    .select('id, casamento_id, mesmo_local_que')
    .eq('id', sameVenueAs)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!target || target.casamento_id !== weddingId) {
    throw badRequestError('Item do cronograma referenciado não encontrado.')
  }
  if (target.mesmo_local_que) {
    throw badRequestError(
      'Esse item já reaproveita o local de outro — aponte diretamente para o item com o endereço original.',
    )
  }
}
