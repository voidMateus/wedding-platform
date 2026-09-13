import { serverSupabaseClient } from '#supabase/server'
import { mesaInputSchema } from '#shared/schemas/mesas'

/**
 * Edita nome, capacidade, formato, medidas e observação. Posição e rotação
 * NÃO passam por aqui — ver `[id]/position.patch.ts`.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw badRequestError('id da mesa não informado.')

  const input = await validateBody(event, mesaInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('mesas')
    .update({
      nome: input.nome,
      capacidade: input.capacidade,
      formato: input.formato,
      largura_cm: input.larguraCm,
      profundidade_cm: input.profundidadeCm,
      observacao: input.observacao ?? null,
    })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw badRequestError('Já existe uma mesa com esse nome.')
    }
    throw badRequestError(error.message)
  }
  if (!data) throw notFoundError('Mesa não encontrada.')

  await recordAuditLog(event, weddingId, memberId, {
    action: 'table.update',
    entityType: 'table',
    entityId: id,
    metadata: { capacidade: input.capacidade },
  })

  return { id }
})
