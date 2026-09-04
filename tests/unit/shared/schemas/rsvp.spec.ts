import { describe, expect, it } from 'vitest'
import {
  rsvpFinalizeSchema,
  rsvpGuestStatusSchema,
  rsvpSearchQuerySchema,
  rsvpSelectSchema,
} from '#shared/schemas/rsvp'

describe('rsvpSearchQuerySchema', () => {
  it('aceita termo com 3+ caracteres', () => {
    expect(rsvpSearchQuerySchema.safeParse({ q: 'Ana' }).success).toBe(true)
  })

  it('rejeita termo com menos de 3 caracteres', () => {
    expect(rsvpSearchQuerySchema.safeParse({ q: 'an' }).success).toBe(false)
  })
})

describe('rsvpSelectSchema', () => {
  it('aceita guestId válido', () => {
    const result = rsvpSelectSchema.safeParse({ guestId: '11111111-1111-1111-1111-111111111111' })
    expect(result.success).toBe(true)
  })

  it('rejeita guestId que não é uuid', () => {
    expect(rsvpSelectSchema.safeParse({ guestId: 'não-é-uuid' }).success).toBe(false)
  })
})

describe('rsvpGuestStatusSchema', () => {
  it('aceita confirmado', () => {
    const result = rsvpGuestStatusSchema.safeParse({ status: 'confirmado' })
    expect(result.success).toBe(true)
  })

  it('aceita recusado', () => {
    const result = rsvpGuestStatusSchema.safeParse({ status: 'recusado' })
    expect(result.success).toBe(true)
  })

  it('rejeita status fora do enum (lista_espera/removido não são escolhas do convidado)', () => {
    expect(rsvpGuestStatusSchema.safeParse({ status: 'lista_espera' }).success).toBe(false)
  })

  it('rejeita quando status não é informado', () => {
    expect(rsvpGuestStatusSchema.safeParse({}).success).toBe(false)
  })
})

describe('rsvpFinalizeSchema', () => {
  it('aceita sem acompanhantes nem mensagem', () => {
    expect(rsvpFinalizeSchema.safeParse({}).success).toBe(true)
  })

  it('aceita com acompanhantes e mensagem', () => {
    const result = rsvpFinalizeSchema.safeParse({
      companions: [{ nomeCompleto: 'Ana Silva' }],
      message: 'Mal podemos esperar!',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita acompanhante sem nome', () => {
    const result = rsvpFinalizeSchema.safeParse({ companions: [{ nomeCompleto: '  ' }] })
    expect(result.success).toBe(false)
  })
})
