import { serverSupabaseClient } from '#supabase/server'
import { plantaSalaoSchema } from '#shared/schemas/mesas'

/**
 * As medidas do salão.
 *
 * Endpoint próprio pelo mesmo motivo do teto global do Financeiro: `PATCH
 * /api/wedding` reescreve o conjunto completo de configurações do evento, e
 * mandar o formulário inteiro a partir da planta é como um campo alheio acaba
 * sobrescrito por um valor velho.
 *
 * Nulo é estado válido e chega até o banco: apagar as medidas devolve a planta
 * ao modo que se ajusta ao conteúdo, e isso é uma escolha ("o salão que eu
 * tinha em mente não é mais esse"), não uma falha de preenchimento.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, plantaSalaoSchema)

  const client = await serverSupabaseClient(event)
  const { error } = await client
    .from('casamentos')
    .update({
      planta_largura_cm: input.larguraCm,
      planta_profundidade_cm: input.profundidadeCm,
    })
    .eq('id', weddingId)

  if (error) throw badRequestError(error.message)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'floorplan.update',
    entityType: 'wedding',
    entityId: weddingId,
    metadata: { larguraCm: input.larguraCm, profundidadeCm: input.profundidadeCm },
  })

  return { larguraCm: input.larguraCm, profundidadeCm: input.profundidadeCm }
})
