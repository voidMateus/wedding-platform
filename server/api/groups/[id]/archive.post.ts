import { serverSupabaseClient } from '#supabase/server'
import { z } from 'zod'

const bodySchema = z.object({ archived: z.boolean() })

/**
 * Arquiva/desarquiva o grupo. Diferente de convites — que têm `arquivado_em`
 * separado de `excluido_em` porque um convite arquivado ainda é uma unidade de
 * RSVP com histórico próprio —, aqui arquivar É o soft delete: grupo é etiqueta
 * organizacional, não tem estado intermediário entre "em uso" e "fora de uso".
 *
 * Convive com DELETE /api/groups/[id], que faz a mesma escrita no sentido
 * "arquivar": o DELETE continua sendo o verbo REST da operação e é o que a
 * suíte de integração cobre; esta rota existe porque só ela sabe voltar atrás,
 * e a UI usa uma só chamada para os dois sentidos.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do grupo não informado.')
  }
  const { archived } = await validateBody(event, bodySchema)

  const client = await serverSupabaseClient(event)

  // Sem `.is('excluido_em', null)` no filtro: desarquivar precisa alcançar
  // justamente a linha que está arquivada.
  const { data, error } = await client
    .from('grupos')
    .update({ excluido_em: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Grupo não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: archived ? 'group.archive' : 'group.unarchive',
    entityType: 'group',
    entityId: data.id,
    metadata: { name: data.nome },
  })

  return data
})
