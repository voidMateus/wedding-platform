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

  it('aceita cota fixa (quotaAmountCents) num presente de cota', () => {
    const result = giftInputSchema.safeParse({
      title: 'Air Fryer',
      isGroupGift: true,
      targetAmountCents: 80000,
      quotaAmountCents: 10000,
    })
    expect(result.success).toBe(true)
  })

  it('aceita estilo emocional com ícone do catálogo', () => {
    const result = giftInputSchema.safeParse({
      title: 'Nos ajude na primeira compra',
      isGroupGift: true,
      targetAmountCents: 30000,
      displayStyle: 'emotional',
      emotionalIcon: 'home',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita ícone fora do catálogo fixo', () => {
    const result = giftInputSchema.safeParse({
      title: 'Nos ajude na primeira compra',
      isGroupGift: true,
      targetAmountCents: 30000,
      displayStyle: 'emotional',
      emotionalIcon: 'foguete-nao-existe',
    })
    expect(result.success).toBe(false)
  })

  it('displayStyle tem "standard" como default', () => {
    const result = giftInputSchema.safeParse({
      title: 'Jogo de panelas',
      isGroupGift: false,
      quantityAvailable: 1,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayStyle).toBe('standard')
    }
  })
})
