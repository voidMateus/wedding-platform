import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete — preserva o histórico de RSVP/presentes associados
 * (CLAUDE.md, seção 11/15.3). Também desvincula de Acompanhantes/Convite
 * (nucleo_id/ordem_nucleo/convite_id): um convidado excluído não deve mais
 * aparecer em sugestões de acompanhantes nem ocupar uma posição no grupo —
 * evita colidir com o índice único (nucleo_id, ordem_nucleo) quando um novo
 * membro é adicionado depois.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convidado não informado.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('convidados')
    .update({
      excluido_em: new Date().toISOString(),
      nucleo_id: null,
      ordem_nucleo: 0,
      convite_id: null,
    })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select('id, nome_completo')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Convidado não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.delete',
    entityType: 'guest',
    entityId: data.id,
    metadata: { fullName: data.nome_completo },
  })

  return { id: data.id }
})
