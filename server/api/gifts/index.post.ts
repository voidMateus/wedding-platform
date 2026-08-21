import { serverSupabaseClient } from '#supabase/server'
import { giftInputSchema } from '#shared/schemas/gifts'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, giftInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('presentes')
    .insert({
      casamento_id: weddingId,
      categoria_id: input.categoriaId || null,
      titulo: input.titulo,
      descricao: input.descricao || null,
      preco_centavos: input.precoCentavos ?? null,
      url_imagem: input.urlImagem || null,
      e_presente_cota: input.ePresenteCota,
      // Espelha o CHECK presentes_mode_fields — nunca os dois preenchidos ao
      // mesmo tempo (CLAUDE.md, seção 12.2).
      quantidade_disponivel: input.ePresenteCota ? null : (input.quantidadeDisponivel ?? 0),
      valor_meta_centavos: input.ePresenteCota ? (input.valorMetaCentavos ?? null) : null,
      valor_cota_centavos: input.ePresenteCota ? (input.valorCotaCentavos ?? null) : null,
      estilo_exibicao: input.ePresenteCota ? input.estiloExibicao : 'padrao',
      icone_emocional: input.estiloExibicao === 'emocional' ? input.iconeEmocional || null : null,
      esta_ativo: input.estaAtivo,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'gift.create',
    entityType: 'gift',
    entityId: data.id,
    metadata: { title: data.titulo },
  })

  setResponseStatus(event, 201)
  return data
})
