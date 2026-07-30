import { describe, expect, it } from 'vitest'
import { rsvpSubmitSchema } from '#shared/schemas/rsvp'

describe('rsvpSubmitSchema', () => {
  it('aceita confirmação sem acompanhantes', () => {
    const result = rsvpSubmitSchema.safeParse({ status: 'confirmed' })
    expect(result.success).toBe(true)
  })

  it('aceita confirmação com acompanhantes', () => {
    const result = rsvpSubmitSchema.safeParse({
      status: 'confirmed',
      companions: [{ fullName: 'Ana Silva', dietaryRestrictions: 'vegetariana' }],
    })
    expect(result.success).toBe(true)
  })

  it('aceita recusa sem restrição/acompanhante', () => {
    const result = rsvpSubmitSchema.safeParse({ status: 'declined', message: 'Não poderei ir.' })
    expect(result.success).toBe(true)
  })

  it('rejeita recusa com acompanhantes informados', () => {
    const result = rsvpSubmitSchema.safeParse({
      status: 'declined',
      companions: [{ fullName: 'Ana Silva' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejeita status fora do enum', () => {
    const result = rsvpSubmitSchema.safeParse({ status: 'pending' })
    expect(result.success).toBe(false)
  })

  it('rejeita acompanhante sem nome', () => {
    const result = rsvpSubmitSchema.safeParse({
      status: 'confirmed',
      companions: [{ fullName: '  ' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejeita quando status não é informado', () => {
    const result = rsvpSubmitSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
