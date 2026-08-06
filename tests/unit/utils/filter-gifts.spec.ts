import { describe, expect, it } from 'vitest'
import { effectiveGiftPriceCents, filterAndSortGifts, segmentGifts } from '#shared/utils/filter-gifts'
import type { FilterableGift, SegmentableGift } from '#shared/utils/filter-gifts'

interface TestGift extends FilterableGift {
  title: string
}

function makeGift(overrides: Partial<TestGift> = {}): TestGift {
  return {
    title: 'Presente',
    categoryName: null,
    priceCents: null,
    targetAmountCents: null,
    ...overrides,
  }
}

describe('effectiveGiftPriceCents', () => {
  it('usa priceCents quando definido', () => {
    expect(effectiveGiftPriceCents(makeGift({ priceCents: 5000 }))).toBe(5000)
  })

  it('cai para targetAmountCents quando priceCents é null (presente de cota)', () => {
    expect(effectiveGiftPriceCents(makeGift({ priceCents: null, targetAmountCents: 20000 }))).toBe(20000)
  })

  it('retorna null quando nenhum dos dois está definido', () => {
    expect(effectiveGiftPriceCents(makeGift())).toBeNull()
  })
})

describe('filterAndSortGifts', () => {
  const gifts = [
    makeGift({ title: 'Jogo de panelas', categoryName: 'Cozinha', priceCents: 15000 }),
    makeGift({ title: 'Toalha de banho', categoryName: 'Casa', priceCents: 5000 }),
    makeGift({ title: 'Liquidificador', categoryName: 'Cozinha', priceCents: 30000 }),
    makeGift({ title: 'Lua de mel', categoryName: 'Cota', priceCents: null, targetAmountCents: 500000 }),
  ]

  it('sem filtros, devolve a lista original na mesma ordem', () => {
    const result = filterAndSortGifts(gifts, { category: null, sortBy: 'default' })
    expect(result.map((g) => g.title)).toEqual(gifts.map((g) => g.title))
  })

  it('filtra por categoria', () => {
    const result = filterAndSortGifts(gifts, { category: 'Cozinha', sortBy: 'default' })
    expect(result.map((g) => g.title)).toEqual(['Jogo de panelas', 'Liquidificador'])
  })

  it('ordena por menor preço', () => {
    const result = filterAndSortGifts(gifts, { category: null, sortBy: 'price-asc' })
    expect(result.map((g) => g.title)).toEqual([
      'Toalha de banho',
      'Jogo de panelas',
      'Liquidificador',
      'Lua de mel',
    ])
  })

  it('ordena por maior preço', () => {
    const result = filterAndSortGifts(gifts, { category: null, sortBy: 'price-desc' })
    expect(result.map((g) => g.title)).toEqual([
      'Lua de mel',
      'Liquidificador',
      'Jogo de panelas',
      'Toalha de banho',
    ])
  })

  it('combina categoria + ordenação ao mesmo tempo', () => {
    const result = filterAndSortGifts(gifts, { category: 'Cozinha', sortBy: 'price-desc' })
    expect(result.map((g) => g.title)).toEqual(['Liquidificador', 'Jogo de panelas'])
  })

  it('não modifica o array original (imutável)', () => {
    const original = [...gifts]
    filterAndSortGifts(gifts, { category: null, sortBy: 'price-asc' })
    expect(gifts).toEqual(original)
  })
})

describe('segmentGifts', () => {
  interface TestSegmentGift extends SegmentableGift {
    title: string
  }

  function makeSegmentGift(overrides: Partial<TestSegmentGift> = {}): TestSegmentGift {
    return { title: 'Presente', isGroupGift: false, displayStyle: 'standard', ...overrides }
  }

  it('separa presente físico em physical', () => {
    const result = segmentGifts([makeSegmentGift({ title: 'Air Fryer', isGroupGift: false })])
    expect(result.physical.map((g) => g.title)).toEqual(['Air Fryer'])
    expect(result.contributions).toEqual([])
    expect(result.emotional).toEqual([])
  })

  it('separa presente de cota padrão em contributions', () => {
    const result = segmentGifts([
      makeSegmentGift({ title: 'Geladeira', isGroupGift: true, displayStyle: 'standard' }),
    ])
    expect(result.contributions.map((g) => g.title)).toEqual(['Geladeira'])
    expect(result.physical).toEqual([])
    expect(result.emotional).toEqual([])
  })

  it('separa presente de cota emocional em emotional', () => {
    const result = segmentGifts([
      makeSegmentGift({ title: 'Primeira compra', isGroupGift: true, displayStyle: 'emotional' }),
    ])
    expect(result.emotional.map((g) => g.title)).toEqual(['Primeira compra'])
    expect(result.physical).toEqual([])
    expect(result.contributions).toEqual([])
  })

  it('preserva a ordem original dentro de cada segmento', () => {
    const result = segmentGifts([
      makeSegmentGift({ title: 'A', isGroupGift: false }),
      makeSegmentGift({ title: 'B', isGroupGift: true, displayStyle: 'standard' }),
      makeSegmentGift({ title: 'C', isGroupGift: false }),
    ])
    expect(result.physical.map((g) => g.title)).toEqual(['A', 'C'])
  })
})
