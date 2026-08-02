import { describe, expect, it } from 'vitest'
import { effectiveGiftPriceCents, filterAndSortGifts } from '#shared/utils/filter-gifts'
import type { FilterableGift } from '#shared/utils/filter-gifts'

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
    const result = filterAndSortGifts(gifts, { category: null, priceRange: null, sortBy: 'default' })
    expect(result.map((g) => g.title)).toEqual(gifts.map((g) => g.title))
  })

  it('filtra por categoria', () => {
    const result = filterAndSortGifts(gifts, { category: 'Cozinha', priceRange: null, sortBy: 'default' })
    expect(result.map((g) => g.title)).toEqual(['Jogo de panelas', 'Liquidificador'])
  })

  it('filtra por faixa de preço (usa o preço efetivo, inclusive presente de cota)', () => {
    const result = filterAndSortGifts(gifts, {
      category: null,
      priceRange: { min: 10000, max: 100000 },
      sortBy: 'default',
    })
    expect(result.map((g) => g.title)).toEqual(['Jogo de panelas', 'Liquidificador'])
  })

  it('exclui presentes sem preço definido quando há filtro de faixa', () => {
    const result = filterAndSortGifts([makeGift({ title: 'Sem preço' })], {
      category: null,
      priceRange: { min: 0, max: 10000 },
      sortBy: 'default',
    })
    expect(result).toEqual([])
  })

  it('ordena por menor preço', () => {
    const result = filterAndSortGifts(gifts, { category: null, priceRange: null, sortBy: 'price-asc' })
    expect(result.map((g) => g.title)).toEqual([
      'Toalha de banho',
      'Jogo de panelas',
      'Liquidificador',
      'Lua de mel',
    ])
  })

  it('ordena por maior preço', () => {
    const result = filterAndSortGifts(gifts, { category: null, priceRange: null, sortBy: 'price-desc' })
    expect(result.map((g) => g.title)).toEqual([
      'Lua de mel',
      'Liquidificador',
      'Jogo de panelas',
      'Toalha de banho',
    ])
  })

  it('combina categoria + faixa de preço + ordenação ao mesmo tempo', () => {
    const result = filterAndSortGifts(gifts, {
      category: 'Cozinha',
      priceRange: { min: 10000 },
      sortBy: 'price-desc',
    })
    expect(result.map((g) => g.title)).toEqual(['Liquidificador', 'Jogo de panelas'])
  })

  it('não modifica o array original (imutável)', () => {
    const original = [...gifts]
    filterAndSortGifts(gifts, { category: null, priceRange: null, sortBy: 'price-asc' })
    expect(gifts).toEqual(original)
  })
})
