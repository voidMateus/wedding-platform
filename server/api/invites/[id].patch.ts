import { serverSupabaseClient } from '#supabase/server'
import { inviteInputSchema } from '#shared/schemas/invites'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }
  const input = await validateBody(event, inviteInputSchema)

  const client = await serverSupabaseClient(event)

  // Convidado Responsável precisa ser um membro atual do próprio convite
  // (CLAUDE.md, seção 12.1).
  if (input.convidadoResponsavelId) {
    const { data: member, error: memberError } = await client
      .from('convidados')
      .select('id')
      .eq('id', input.convidadoResponsavelId)
      .eq('convite_id', id)
      .is('excluido_em', null)
      .maybeSingle()

    if (memberError) throw badRequestError(memberError.message)
    if (!member) {
      throw badRequestError('O responsável precisa ser um convidado deste convite.')
    }
  }

  const { data, error } = await client
    .from('convites')
    .update({
      nome: input.nome,
      observacoes: input.observacoes || null,
      convidado_responsavel_id: input.convidadoResponsavelId || null,
      max_acompanhantes: input.maxAcompanhantes ?? null,
    })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Convite não encontrado.')
  }

  if (input.tagIds) {
    const { error: deleteLinksError } = await client.from('vinculos_convite_etiqueta').delete().eq('convite_id', id)
    if (deleteLinksError) throw badRequestError(deleteLinksError.message)

    if (input.tagIds.length > 0) {
      const { error: insertLinksError } = await client
        .from('vinculos_convite_etiqueta')
        .insert(input.tagIds.map((tagId) => ({ convite_id: id, etiqueta_id: tagId })))
      if (insertLinksError) throw badRequestError(insertLinksError.message)
    }
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.update',
    entityType: 'invite',
    entityId: data.id,
    metadata: { name: data.nome },
  })

  return data
})
