import { describe, expect, it } from 'vitest'
import { guestInputSchema } from '#shared/schemas/guests'

const validGroupId = '11111111-1111-1111-1111-111111111111'

describe('guestInputSchema', () => {
  it('aceita um convidado válido com todos os campos', () => {
    const result = guestInputSchema.safeParse({
      groupId: validGroupId,
      fullName: 'Maria Silva',
      email: 'maria@example.com',
      phone: '+55 11 90000-0000',
      isChild: false,
      dietaryRestrictions: 'vegetariana',
    })

    expect(result.success).toBe(true)
  })

  it('aceita um convidado sem e-mail nem telefone (não são obrigatórios)', () => {
    const result = guestInputSchema.safeParse({
      groupId: validGroupId,
      fullName: 'Maria Silva',
    })

    expect(result.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = guestInputSchema.safeParse({ groupId: validGroupId, fullName: '  ' })

    expect(result.success).toBe(false)
  })

  it('rejeita groupId que não é um uuid', () => {
    const result = guestInputSchema.safeParse({ groupId: 'não-é-um-uuid', fullName: 'Maria' })

    expect(result.success).toBe(false)
  })

  it('rejeita e-mail em formato inválido quando preenchido', () => {
    const result = guestInputSchema.safeParse({
      groupId: validGroupId,
      fullName: 'Maria',
      email: 'não-é-email',
    })

    expect(result.success).toBe(false)
  })

  it('isChild tem default false', () => {
    const result = guestInputSchema.safeParse({ groupId: validGroupId, fullName: 'Maria' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isChild).toBe(false)
    }
  })
})
