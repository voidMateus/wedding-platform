import { serverSupabaseClient } from '#supabase/server'
import { photoMetadataSchema } from '#shared/schemas/photos'

// Só metadados (legenda/ordem) — trocar a foto em si é remover e enviar de
// novo, não um PATCH parcial do arquivo.
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id da foto não informado.')
  }
  const input = await validateBody(event, photoMetadataSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('fotos')
    .update({
      legenda: input.legenda || null,
      ordem_exibicao: input.ordemExibicao,
      foco_x: input.focoX,
      foco_y: input.focoY,
    })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Foto não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'photo.update',
    entityType: 'photo',
    entityId: data.id,
  })

  return { ...data, url: resolvePhotoServedUrl(data) }
})
