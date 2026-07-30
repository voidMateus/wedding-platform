import { describe, expect, it } from 'vitest'
import { giftInputSchema } from '#shared/schemas/gifts'

describe('giftInputSchema', () => {
  it('aceita um presente simples válido', () => {
    const result = giftInputSchema.safeParse({
      title: 'Jogo de panelas',
      isGroupGift: false,
      quantityAvailable: 2,
    })
    expect(result.success).toBe(true)
  })

  it('aceita um presente de cota válido', () => {
    const result = giftInputSchema.safeParse({
      title: 'Lua de mel',
      isGroupGift: true,
      targetAmountCents: 500000,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita presente simples sem quantidade disponível', () => {
    const result = giftInputSchema.safeParse({ title: 'Jogo de panelas', isGroupGift: false })
    expect(result.success).toBe(false)
  })

  it('rejeita presente de cota sem valor-alvo', () => {
    const result = giftInputSchema.safeParse({ title: 'Lua de mel', isGroupGift: true })
    expect(result.success).toBe(false)
  })

  it('rejeita presente de cota com valor-alvo zero', () => {
    const result = giftInputSchema.safeParse({
      title: 'Lua de mel',
      isGroupGift: true,
      targetAmountCents: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita título vazio', () => {
    const result = giftInputSchema.safeParse({
      title: '  ',
      isGroupGift: false,
      quantityAvailable: 1,
    })
    expect(result.success).toBe(false)
  })

  it('aceita quantityAvailable igual a zero (esgotado)', () => {
    const result = giftInputSchema.safeParse({
      title: 'Jogo de panelas',
      isGroupGift: false,
      quantityAvailable: 0,
    })
    expect(result.success).toBe(true)
  })
})
