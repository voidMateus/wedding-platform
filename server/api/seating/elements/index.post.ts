import { serverSupabaseClient } from '#supabase/server'
import { elementoInputSchema } from '#shared/schemas/mesas'

/**
 * Cria um elemento do salão (pista, palco, buffet, bolo, entrada, bar).
 *
 * Sem capacidade e sem ninguém sentado: é referência espacial, e é por causa
 * dela que "não coloque a tia Cléia na mesa colada na caixa de som" vira uma
 * decisão que a planta permite tomar.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, elementoInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('elementos_planta')
    .insert({
      casamento_id: weddingId,
      tipo: input.tipo,
      nome: input.nome ?? null,
      largura_cm: input.larguraCm,
      profundidade_cm: input.profundidadeCm,
      posicao_x_cm: input.posicaoXCm,
      posicao_y_cm: input.posicaoYCm,
      rotacao_graus: input.rotacaoGraus,
    })
    .select('id')
    .single()

  if (error) throw badRequestError(error.message)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'floorplan_element.create',
    entityType: 'floorplan_element',
    entityId: data.id,
    metadata: { tipo: input.tipo },
  })

  setResponseStatus(event, 201)
  return { id: data.id }
})
