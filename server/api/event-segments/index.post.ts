import { serverSupabaseClient } from '#supabase/server'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, eventSegmentInputSchema)

  const client = await serverSupabaseClient(event)

  const sameVenueAs = input.mesmoLocalQue || null
  if (sameVenueAs) {
    await validateSameVenueTarget(client, weddingId, sameVenueAs)
  }

  const { data, error } = await client
    .from('etapas_evento')
    .insert({
      casamento_id: weddingId,
      titulo: input.titulo,
      // Com mesmo_local_que definido, este registro nunca guarda seu próprio
      // local — evita duas fontes de verdade divergentes (CLAUDE.md, 12.2).
      nome_local: sameVenueAs ? null : input.nomeLocal || null,
      endereco_local: sameVenueAs ? null : input.enderecoLocal || null,
      latitude_local: sameVenueAs ? null : (input.latitudeLocal ?? null),
      longitude_local: sameVenueAs ? null : (input.longitudeLocal ?? null),
      mesmo_local_que: sameVenueAs,
      inicia_em: input.iniciaEm || null,
      termina_em: input.terminaEm || null,
      ordem_exibicao: input.ordemExibicao,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'event_segment.create',
    entityType: 'event_segment',
    entityId: data.id,
    metadata: { title: data.titulo },
  })

  setResponseStatus(event, 201)
  return data
})
