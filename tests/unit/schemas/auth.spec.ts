import { describe, expect, it } from 'vitest'
import { loginWithMagicLinkSchema, loginWithPasswordSchema } from '#shared/schemas/auth'

describe('loginWithPasswordSchema', () => {
  it('aceita e-mail e senha válidos', () => {
    const result = loginWithPasswordSchema.safeParse({
      email: 'casal@example.com',
      password: 'senha-forte-123',
    })

    expect(result.success).toBe(true)
  })

  it('rejeita e-mail em formato inválido', () => {
    const result = loginWithPasswordSchema.safeParse({
      email: 'não-é-email',
      password: 'senha-forte-123',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita senha com menos de 8 caracteres', () => {
    const result = loginWithPasswordSchema.safeParse({
      email: 'casal@example.com',
      password: '1234567',
    })

    expect(result.success).toBe(false)
  })
})

describe('loginWithMagicLinkSchema', () => {
  it('aceita apenas um e-mail válido', () => {
    const result = loginWithMagicLinkSchema.safeParse({ email: 'casal@example.com' })

    expect(result.success).toBe(true)
  })

  it('rejeita e-mail ausente', () => {
    const result = loginWithMagicLinkSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
