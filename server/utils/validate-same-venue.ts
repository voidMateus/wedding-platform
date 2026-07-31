import type { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

type SupabaseClient = Awaited<ReturnType<typeof serverSupabaseClient<Database>>>

/**
 * Valida o alvo de `same_venue_as` (CLAUDE.md, seção 12.2 — cerimônia e
 * recepção no mesmo local): precisa existir, pertencer ao mesmo casamento,
 * não ser o próprio segmento (auto-referência) e não ter, ele mesmo, um
 * `same_venue_as` definido — só um nível de indireção, nunca uma corrente.
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
    .from('event_segments')
    .select('id, wedding_id, same_venue_as')
    .eq('id', sameVenueAs)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!target || target.wedding_id !== weddingId) {
    throw badRequestError('Item do cronograma referenciado não encontrado.')
  }
  if (target.same_venue_as) {
    throw badRequestError(
      'Esse item já reaproveita o local de outro — aponte diretamente para o item com o endereço original.',
    )
  }
}
