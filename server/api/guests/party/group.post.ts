import { serverSupabaseClient } from '#supabase/server'
import { guestPartyGroupSchema } from '#shared/schemas/guests'

/**
 * Agrupa os convidados selecionados como Acompanhantes (um `nucleo_id` só).
 *
 * É a operação que faltava para quem monta a lista por entrada rápida ou
 * colando da planilha: os nomes entram soltos e o agrupamento vem depois.
 * Antes só existia o caminho do cadastro, um a um.
 *
 * Não é uma ação em massa como as de grupo e categoria (`guestBulkUpdateSchema`
 * as recusa de propósito): núcleo, ordem e convite mudam juntos, e um update
 * em lote atravessando isso quebraria a garantia de que ninguém entra em dois
 * convites. Toda a decisão fica em `agrupar_acompanhantes()`, numa transação.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestPartyGroupSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client.rpc('agrupar_acompanhantes', {
    p_casamento_id: weddingId,
    p_ids: input.ids,
  })

  if (error) {
    // Núcleo não atravessa convites: se as pessoas vão em convites diferentes,
    // elas deixaram de ser "convidadas juntas". A recusa é explícita porque a
    // alternativa seria mover alguém de convite — trocando o link/QR que já
    // pode ter sido compartilhado.
    if (error.message.includes('GUESTS_IN_DIFFERENT_INVITES')) {
      throw conflictError(
        'Essas pessoas estão em convites diferentes. Acompanhantes vão sempre no mesmo convite — junte os convites antes, ou agrupe só quem já está no mesmo.',
      )
    }
    if (error.message.includes('GUEST_IS_DRAFT')) {
      throw conflictError(
        'Quem está em consideração não entra em Acompanhantes — promova a convidado primeiro.',
      )
    }
    if (error.message.includes('PARTY_NEEDS_TWO_GUESTS')) {
      throw badRequestError('Selecione ao menos duas pessoas para agrupar.')
    }
    throw badRequestError(error.message)
  }

  const resultado = data as { partyId: string; guestIds: string[]; inviteId: string | null }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.party_group',
    entityType: 'guest_party',
    entityId: resultado.partyId,
    metadata: { guestCount: resultado.guestIds.length },
  })

  return resultado
})
