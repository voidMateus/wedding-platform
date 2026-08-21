import { serverSupabaseClient } from '#supabase/server'
import { guestPartySyncSchema } from '#shared/schemas/guests'

/**
 * Persistência inteligente em lote do wizard de convidado (CLAUDE.md, seção
 * 12.1) — mesma lógica para criar e editar. Delega toda a sincronização
 * (convidado principal + Acompanhantes + Convite opcional) para
 * sincronizar_nucleo_convidado(), rodando em uma única transação no Postgres.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestPartySyncSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client.rpc('sincronizar_nucleo_convidado', {
    p_casamento_id: weddingId,
    p_principal: input.primary,
    p_acompanhantes: input.companions,
    p_ids_convidados_removidos: input.removedGuestIds,
    p_convite: input.invite ?? null,
  })

  if (error) {
    if (error.message.includes('PRIMARY_GUEST_NOT_FOUND')) {
      throw notFoundError('Convidado não encontrado.')
    }
    if (error.message.includes('GUEST_ALREADY_IN_ANOTHER_INVITE')) {
      throw conflictError('Um dos acompanhantes já pertence a outro convite.')
    }
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: input.primary.id ? 'guest.party_sync.update' : 'guest.party_sync.create',
    entityType: 'guest',
    entityId: (data as { primaryGuestId: string }).primaryGuestId,
    metadata: { companionCount: (input.companions ?? []).length },
  })

  return data
})
