// Filtro + ordenação da vitrine de presentes (CLAUDE.md, "Fase Vermelho
// Clássico") — função pura para poder ser testada com dados sintéticos sem
// precisar montar o componente/mockar o fetch (GiftsShowcase.vue só chama
// isto a partir de um computed).

export interface FilterableGift {
  categoryName: string | null
  precoCentavos: number | null
  valorMetaCentavos: number | null
}

export interface GiftFilterOptions {
  category: string | null
  sortBy: string
}

// Presente de cota (e_presente_cota) não tem precoCentavos — o "preço"
// efetivo para filtro/ordenação é o valor-alvo da cota (CLAUDE.md, seção 18.2).
export function effectiveGiftPriceCents(gift: FilterableGift): number | null {
  return gift.precoCentavos ?? gift.valorMetaCentavos ?? null
}

export interface SegmentableGift {
  ePresenteCota: boolean
  estiloExibicao: 'padrao' | 'emocional'
}

export interface GiftSegments<T> {
  physical: T[]
  contributions: T[]
  emotional: T[]
}

// Separa a vitrine em Lista de Presentes / Contribuições / Presentes
// Emocionais ("Presentes 2.0", CLAUDE.md seção 18) — presente emocional não
// é uma entidade nova, é um presente de cota com estiloExibicao='emocional'.
export function segmentGifts<T extends SegmentableGift>(gifts: T[]): GiftSegments<T> {
  const physical: T[] = []
  const contributions: T[] = []
  const emotional: T[] = []

  for (const gift of gifts) {
    if (!gift.ePresenteCota) {
      physical.push(gift)
    } else if (gift.estiloExibicao === 'emocional') {
      emotional.push(gift)
    } else {
      contributions.push(gift)
    }
  }

  return { physical, contributions, emotional }
}

export function filterAndSortGifts<T extends FilterableGift>(gifts: T[], options: GiftFilterOptions): T[] {
  let result = gifts

  if (options.category) {
    result = result.filter((gift) => gift.categoryName === options.category)
  }

  if (options.sortBy === 'price-asc' || options.sortBy === 'price-desc') {
    const direction = options.sortBy === 'price-asc' ? 1 : -1
    result = [...result].sort(
      (a, b) => direction * ((effectiveGiftPriceCents(a) ?? 0) - (effectiveGiftPriceCents(b) ?? 0)),
    )
  }

  return result
}
