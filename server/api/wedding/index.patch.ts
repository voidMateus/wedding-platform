import { serverSupabaseClient } from '#supabase/server'
import { weddingSettingsSchema } from '#shared/schemas/wedding'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, weddingSettingsSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('casamentos')
    .update({
      nomes_noivos: input.nomesNoivos,
      data_evento: input.dataEvento,
      horario_evento: input.horarioEvento || null,
      prazo_rsvp: input.prazoRsvp || null,
      idade_maxima_crianca: input.idadeMaximaCrianca,
      modo_lista_convidados: input.modoListaConvidados,
      handle_infinitepay: input.handleInfinitepay || null,
      modo_entrega_presente_fisico: input.modoEntregaPresenteFisico,
    })
    .eq('id', weddingId)
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.update',
    entityType: 'wedding',
    entityId: weddingId,
  })

  return data
})
