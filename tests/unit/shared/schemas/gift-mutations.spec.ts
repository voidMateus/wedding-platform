import { describe, expect, it } from 'vitest'
import { giftReserveSchema } from '#shared/schemas/gift-mutations'

describe('giftReserveSchema', () => {
  it('aceita um nome válido', () => {
    expect(giftReserveSchema.safeParse({ nomePresenteador: 'Maria' }).success).toBe(true)
  })

  it('aceita telefone e mensagem opcionais', () => {
    const result = giftReserveSchema.safeParse({
      nomePresenteador: 'Maria',
      telefonePresenteador: '(11) 99999-9999',
      message: 'Com carinho!',
    })
    expect(result.success).toBe(true)
  })

  it('aceita ausência de telefone e mensagem', () => {
    expect(giftReserveSchema.safeParse({ nomePresenteador: 'Maria' }).success).toBe(true)
  })

  it('rejeita ausência de nome (identificação obrigatória — CLAUDE.md, seção 18)', () => {
    expect(giftReserveSchema.safeParse({}).success).toBe(false)
  })

  it('rejeita nome vazio', () => {
    expect(giftReserveSchema.safeParse({ nomePresenteador: '  ' }).success).toBe(false)
  })
})
