import { describe, expect, it } from 'vitest'
import {
  giftCancelSchema,
  giftContributeSchema,
  giftReserveSchema,
} from '#shared/schemas/gift-mutations'

describe('giftReserveSchema', () => {
  it('aceita um código válido', () => {
    expect(giftReserveSchema.safeParse({ code: 'abc123' }).success).toBe(true)
  })

  it('rejeita código vazio', () => {
    expect(giftReserveSchema.safeParse({ code: '' }).success).toBe(false)
  })

  it('rejeita ausência de código', () => {
    expect(giftReserveSchema.safeParse({}).success).toBe(false)
  })
})

describe('giftContributeSchema', () => {
  it('aceita código e valor válidos', () => {
    expect(giftContributeSchema.safeParse({ code: 'abc123', amountCents: 5000 }).success).toBe(
      true,
    )
  })

  it('rejeita valor zero', () => {
    expect(giftContributeSchema.safeParse({ code: 'abc123', amountCents: 0 }).success).toBe(false)
  })

  it('rejeita valor negativo', () => {
    expect(giftContributeSchema.safeParse({ code: 'abc123', amountCents: -100 }).success).toBe(
      false,
    )
  })
})

describe('giftCancelSchema', () => {
  it('aceita um código válido', () => {
    expect(giftCancelSchema.safeParse({ code: 'abc123' }).success).toBe(true)
  })

  it('rejeita ausência de código', () => {
    expect(giftCancelSchema.safeParse({}).success).toBe(false)
  })
})
