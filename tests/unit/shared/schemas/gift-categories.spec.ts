import { describe, expect, it } from 'vitest'
import { giftCategoryInputSchema } from '#shared/schemas/gift-categories'

describe('giftCategoryInputSchema', () => {
  it('aceita um nome válido', () => {
    const result = giftCategoryInputSchema.safeParse({ name: 'Cozinha', displayOrder: 1 })
    expect(result.success).toBe(true)
  })

  it('usa 0 como padrão de displayOrder', () => {
    const result = giftCategoryInputSchema.safeParse({ name: 'Cozinha' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.displayOrder).toBe(0)
  })

  it('rejeita nome vazio', () => {
    const result = giftCategoryInputSchema.safeParse({ name: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejeita displayOrder negativo', () => {
    const result = giftCategoryInputSchema.safeParse({ name: 'Cozinha', displayOrder: -1 })
    expect(result.success).toBe(false)
  })
})
