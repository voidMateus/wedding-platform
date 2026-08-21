/**
 * Vitrine pública de presentes (CLAUDE.md, seção 18.2) — sem autenticação,
 * sem token de convite: a página é acessível a qualquer momento pelo link
 * público do casamento, sem exigir um link personalizado por convite (CLAUDE.md,
 * seção 18.2/4.5). Nunca expõe quem reservou/contribuiu o quê para os demais.
 * Resolvido por slug (CLAUDE.md, seção 4.4/33).
 */
export default defineEventHandler(async (event) => {
  const slug = getWeddingSlugParam(event)

  const client = supabaseAdmin(event)

  const { data: wedding, error: weddingError } = await client
    .from('casamentos')
    .select('id, handle_infinitepay, modo_entrega_presente_fisico')
    .eq('slug', slug)
    .single()

  if (weddingError) {
    throw notFoundError('Casamento não encontrado.')
  }

  const { data: gifts, error: giftsError } = await client
    .from('presentes')
    .select('*')
    .eq('casamento_id', wedding.id)
    .eq('esta_ativo', true)
    .is('excluido_em', null)
    .order('created_at', { ascending: true })

  if (giftsError) {
    throw badRequestError(giftsError.message)
  }

  const { data: categories, error: categoriesError } = await client
    .from('categorias_presentes')
    .select('id, nome')
    .eq('casamento_id', wedding.id)

  if (categoriesError) {
    throw badRequestError(categoriesError.message)
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.nome]))

  const groupGiftIds = gifts.filter((g) => g.e_presente_cota).map((g) => g.id)

  const collectedByGiftId = new Map<string, number>()
  if (groupGiftIds.length > 0) {
    const { data: contributions, error: contributionsError } = await client
      .from('contribuicoes_presentes')
      .select('presente_id, valor_centavos')
      .in('presente_id', groupGiftIds)

    if (contributionsError) {
      throw badRequestError(contributionsError.message)
    }

    for (const contribution of contributions ?? []) {
      collectedByGiftId.set(
        contribution.presente_id,
        (collectedByGiftId.get(contribution.presente_id) ?? 0) + contribution.valor_centavos,
      )
    }
  }

  const hasPixOption = Boolean(wedding.handle_infinitepay)
  const physicalDeliveryMode = wedding.modo_entrega_presente_fisico as
    | 'ambos'
    | 'somente_compra_propria'
    | 'somente_pagamento'

  const data = gifts.map((gift) => ({
    id: gift.id,
    title: gift.titulo,
    description: gift.descricao,
    priceCents: gift.preco_centavos,
    imageUrl: gift.url_imagem,
    categoryId: gift.categoria_id,
    categoryName: gift.categoria_id ? (categoryNameById.get(gift.categoria_id) ?? null) : null,
    isGroupGift: gift.e_presente_cota,
    quantityAvailable: gift.quantidade_disponivel,
    targetAmountCents: gift.valor_meta_centavos,
    quotaAmountCents: gift.valor_cota_centavos,
    displayStyle: gift.estilo_exibicao as 'padrao' | 'emocional',
    emotionalIcon: gift.icone_emocional,
    collectedAmountCents: gift.e_presente_cota ? (collectedByGiftId.get(gift.id) ?? 0) : null,
    hasPixOption,
    physicalDeliveryMode,
  }))

  return { data }
})
