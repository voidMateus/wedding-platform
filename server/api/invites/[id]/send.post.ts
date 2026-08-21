import { serverSupabaseClient } from '#supabase/server'

/** Marca o convite como enviado — registra enviado_em e o evento na Linha do Tempo. */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('convites')
    .update({ status_convite: 'enviado', enviado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select()
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!data) throw notFoundError('Convite não encontrado.')

  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: id,
    tipo_evento: 'token.sent',
    metadados: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.send',
    entityType: 'invite',
    entityId: id,
    metadata: {},
  })

  return data
})
