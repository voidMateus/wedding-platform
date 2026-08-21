import { describe, expect, it } from 'vitest'
import { giftCheckoutSchema, giftPaymentStatusQuerySchema } from '#shared/schemas/gift-payments'

const BASE = { giverName: 'Maria' }

describe('giftCheckoutSchema', () => {
  it('aceita só o nome (reserva paga de presente simples — valor vem do gift no servidor)', () => {
    expect(giftCheckoutSchema.safeParse(BASE).success).toBe(true)
  })

  it('aceita nome + valor livre', () => {
    expect(giftCheckoutSchema.safeParse({ ...BASE, amountCents: 5000 }).success).toBe(true)
  })

  it('aceita nome + quantidade de cotas', () => {
    expect(giftCheckoutSchema.safeParse({ ...BASE, quotaCount: 3 }).success).toBe(true)
  })

  it('aceita telefone e mensagem opcionais', () => {
    const result = giftCheckoutSchema.safeParse({
      ...BASE,
      giverPhone: '(11) 99999-9999',
      message: 'Parabéns!',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita ausência de nome (identificação obrigatória — CLAUDE.md, seção 18)', () => {
    expect(giftCheckoutSchema.safeParse({}).success).toBe(false)
  })

  it('rejeita amountCents e quotaCount juntos', () => {
    const result = giftCheckoutSchema.safeParse({ ...BASE, amountCents: 5000, quotaCount: 2 })
    expect(result.success).toBe(false)
  })

  it('rejeita valor zero', () => {
    expect(giftCheckoutSchema.safeParse({ ...BASE, amountCents: 0 }).success).toBe(false)
  })

  it('rejeita quantidade de cotas zero', () => {
    expect(giftCheckoutSchema.safeParse({ ...BASE, quotaCount: 0 }).success).toBe(false)
  })
})

describe('giftPaymentStatusQuerySchema', () => {
  it('aceita query vazia (paymentId na URL já basta como credencial)', () => {
    expect(giftPaymentStatusQuerySchema.safeParse({}).success).toBe(true)
  })

  it('aceita transactionNsu/slug opcionais', () => {
    const result = giftPaymentStatusQuerySchema.safeParse({
      transactionNsu: 'abc',
      slug: 'xyz',
    })
    expect(result.success).toBe(true)
  })
})
