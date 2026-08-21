import { describe, expect, it } from 'vitest'
import { giftCheckoutSchema, giftPaymentStatusQuerySchema } from '#shared/schemas/gift-payments'

const BASE = { nomePresenteador: 'Maria' }

describe('giftCheckoutSchema', () => {
  it('aceita só o nome (reserva paga de presente simples — valor vem do gift no servidor)', () => {
    expect(giftCheckoutSchema.safeParse(BASE).success).toBe(true)
  })

  it('aceita nome + valor livre', () => {
    expect(giftCheckoutSchema.safeParse({ ...BASE, valorCentavos: 5000 }).success).toBe(true)
  })

  it('aceita nome + quantidade de cotas', () => {
    expect(giftCheckoutSchema.safeParse({ ...BASE, quantidadeCotas: 3 }).success).toBe(true)
  })

  it('aceita telefone e mensagem opcionais', () => {
    const result = giftCheckoutSchema.safeParse({
      ...BASE,
      telefonePresenteador: '(11) 99999-9999',
      message: 'Parabéns!',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita ausência de nome (identificação obrigatória — CLAUDE.md, seção 18)', () => {
    expect(giftCheckoutSchema.safeParse({}).success).toBe(false)
  })

  it('rejeita valorCentavos e quantidadeCotas juntos', () => {
    const result = giftCheckoutSchema.safeParse({
      ...BASE,
      valorCentavos: 5000,
      quantidadeCotas: 2,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita valor zero', () => {
    expect(giftCheckoutSchema.safeParse({ ...BASE, valorCentavos: 0 }).success).toBe(false)
  })

  it('rejeita quantidade de cotas zero', () => {
    expect(giftCheckoutSchema.safeParse({ ...BASE, quantidadeCotas: 0 }).success).toBe(false)
  })
})

describe('giftPaymentStatusQuerySchema', () => {
  it('aceita query vazia (paymentId na URL já basta como credencial)', () => {
    expect(giftPaymentStatusQuerySchema.safeParse({}).success).toBe(true)
  })

  it('aceita nsuTransacao/slug opcionais', () => {
    const result = giftPaymentStatusQuerySchema.safeParse({
      nsuTransacao: 'abc',
      slug: 'xyz',
    })
    expect(result.success).toBe(true)
  })
})
