import { serverSupabaseClient } from '#supabase/server'
import { guestPartyReorderSchema } from '#shared/schemas/guests'

/** Reordena os Acompanhantes de um grupo — persiste em toda a plataforma (CLAUDE.md, seção 12.1). */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestPartyReorderSchema)

  const client = await serverSupabaseClient(event)

  const { data: members, error: membersError } = await client
    .from('guests')
    .select('id')
    .eq('party_id', input.partyId)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)

  if (membersError) throw badRequestError(membersError.message)

  const memberIds = new Set((members ?? []).map((m) => m.id))
  const validOrderedIds = input.orderedGuestIds.filter((id) => memberIds.has(id))

  if (validOrderedIds.length !== memberIds.size) {
    throw badRequestError('A lista de reordenação precisa incluir todos os membros do grupo.')
  }

  // Duas passagens: (party_id, party_order) tem índice único, então trocar
  // posições diretamente (ex.: 0<->1) colidiria em uma UPDATE intermediária.
  // A primeira passagem move todos para um intervalo alto (nunca colide com
  // 0..n-1); a segunda grava os valores finais.
  for (let index = 0; index < validOrderedIds.length; index += 1) {
    const { error } = await client
      .from('guests')
      .update({ party_order: 1000 + index })
      .eq('id', validOrderedIds[index])
      .eq('wedding_id', weddingId)

    if (error) throw badRequestError(error.message)
  }

  for (let index = 0; index < validOrderedIds.length; index += 1) {
    const { error } = await client
      .from('guests')
      .update({ party_order: index })
      .eq('id', validOrderedIds[index])
      .eq('wedding_id', weddingId)

    if (error) throw badRequestError(error.message)
  }

  return { partyId: input.partyId, orderedGuestIds: validOrderedIds }
})
