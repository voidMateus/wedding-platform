import { describe, expect, it } from 'vitest'
import { guestGroupInputSchema } from '#shared/schemas/guest-groups'

describe('guestGroupInputSchema', () => {
  it('aceita um grupo válido', () => {
    const result = guestGroupInputSchema.safeParse({
      name: 'Família Silva',
      maxMembers: 4,
      notes: 'Sentar perto dos padrinhos',
    })

    expect(result.success).toBe(true)
  })

  it('aceita maxMembers vindo como string (input HTML) e converte para number', () => {
    const result = guestGroupInputSchema.safeParse({
      name: 'Família Silva',
      maxMembers: '4',
      notes: '',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.maxMembers).toBe(4)
    }
  })

  it('rejeita nome vazio', () => {
    const result = guestGroupInputSchema.safeParse({ name: '  ', maxMembers: 0 })

    expect(result.success).toBe(false)
  })

  it('rejeita maxMembers negativo', () => {
    const result = guestGroupInputSchema.safeParse({ name: 'Grupo', maxMembers: -1 })

    expect(result.success).toBe(false)
  })

  it('rejeita maxMembers não inteiro', () => {
    const result = guestGroupInputSchema.safeParse({ name: 'Grupo', maxMembers: 2.5 })

    expect(result.success).toBe(false)
  })

  it('notes é opcional', () => {
    const result = guestGroupInputSchema.safeParse({ name: 'Grupo', maxMembers: 0 })

    expect(result.success).toBe(true)
  })
})
