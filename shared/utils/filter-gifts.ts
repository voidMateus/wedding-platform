// Filtro + ordenação da vitrine de presentes (CLAUDE.md, "Fase Vermelho
// Clássico") — função pura para poder ser testada com dados sintéticos sem
// precisar montar o componente/mockar o fetch (GiftsShowcase.vue só chama
// isto a partir de um computed).

export interface FilterableGift {
  categoryName: string | null
  priceCents: number | null
  targetAmountCents: number | null
}

export interface GiftPriceRange {
  min?: number
  max?: number
}

export interface GiftFilterOptions {
  category: string | null
  priceRange: GiftPriceRange | null
  sortBy: string
}

// Presente de cota (is_group_gift) não tem priceCents — o "preço" efetivo
// para filtro/ordenação é o valor-alvo da cota (CLAUDE.md, seção 18.2).
export function effectiveGiftPriceCents(gift: FilterableGift): number | null {
  return gift.priceCents ?? gift.targetAmountCents ?? null
}

export function filterAndSortGifts<T extends FilterableGift>(gifts: T[], options: GiftFilterOptions): T[] {
  let result = gifts

  if (options.category) {
    result = result.filter((gift) => gift.categoryName === options.category)
  }

  if (options.priceRange) {
    const { min, max } = options.priceRange
    result = result.filter((gift) => {
      const price = effectiveGiftPriceCents(gift)
      if (price === null) return false
      if (min !== undefined && price < min) return false
      if (max !== undefined && price >= max) return false
      return true
    })
  }

  if (options.sortBy === 'price-asc' || options.sortBy === 'price-desc') {
    const direction = options.sortBy === 'price-asc' ? 1 : -1
    result = [...result].sort(
      (a, b) => direction * ((effectiveGiftPriceCents(a) ?? 0) - (effectiveGiftPriceCents(b) ?? 0)),
    )
  }

  return result
}
