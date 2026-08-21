import { describe, expect, it } from 'vitest'
import { giftCategoryInputSchema } from '#shared/schemas/gift-categories'

describe('giftCategoryInputSchema', () => {
  it('aceita um nome válido', () => {
    const result = giftCategoryInputSchema.safeParse({ nome: 'Cozinha', ordemExibicao: 1 })
    expect(result.success).toBe(true)
  })

  it('usa 0 como padrão de ordemExibicao', () => {
    const result = giftCategoryInputSchema.safeParse({ nome: 'Cozinha' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.ordemExibicao).toBe(0)
  })

  it('rejeita nome vazio', () => {
    const result = giftCategoryInputSchema.safeParse({ nome: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejeita ordemExibicao negativo', () => {
    const result = giftCategoryInputSchema.safeParse({ nome: 'Cozinha', ordemExibicao: -1 })
    expect(result.success).toBe(false)
  })
})
