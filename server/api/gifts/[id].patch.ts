import { serverSupabaseClient } from '#supabase/server'
import { giftInputSchema } from '#shared/schemas/gifts'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do presente não informado.')
  }
  const input = await validateBody(event, giftInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('presentes')
    .update({
      categoria_id: input.categoriaId || null,
      titulo: input.titulo,
      descricao: input.descricao || null,
      preco_centavos: input.precoCentavos ?? null,
      url_imagem: input.urlImagem || null,
      e_presente_cota: input.ePresenteCota,
      quantidade_disponivel: input.ePresenteCota ? null : (input.quantidadeDisponivel ?? 0),
      valor_meta_centavos: input.ePresenteCota ? (input.valorMetaCentavos ?? null) : null,
      valor_cota_centavos: input.ePresenteCota ? (input.valorCotaCentavos ?? null) : null,
      estilo_exibicao: input.ePresenteCota ? input.estiloExibicao : 'padrao',
      icone_emocional: input.estiloExibicao === 'emocional' ? input.iconeEmocional || null : null,
      esta_ativo: input.estaAtivo,
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
    throw notFoundError('Presente não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift.update',
    entityType: 'gift',
    entityId: id,
    metadata: { title: data.titulo },
  })

  return data
})
