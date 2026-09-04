import { describe, expect, it } from 'vitest'
import {
  guestPartyReorderSchema,
  guestPartySyncSchema,
  guestPersonSchema,
} from '#shared/schemas/guests'

const validGroupId = '11111111-1111-1111-1111-111111111111'

describe('guestPersonSchema', () => {
  it('aceita um convidado válido com todos os campos', () => {
    const result = guestPersonSchema.safeParse({
      nomeCompleto: 'Maria Silva',
      apelido: 'Mari',
      sexo: 'feminino',
      dataNascimento: '1990-01-01',
      papelCasamento: 'madrinha',
      observacoes: 'Chegará mais cedo',
      grupoId: validGroupId,
    })

    expect(result.success).toBe(true)
  })

  it('aceita um convidado só com o nome (demais campos opcionais)', () => {
    const result = guestPersonSchema.safeParse({ nomeCompleto: 'Maria Silva' })

    expect(result.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = guestPersonSchema.safeParse({ nomeCompleto: '  ' })

    expect(result.success).toBe(false)
  })

  it('rejeita sexo fora do enum', () => {
    const result = guestPersonSchema.safeParse({ nomeCompleto: 'Maria', sexo: 'qualquer-coisa' })

    expect(result.success).toBe(false)
  })

  it('rejeita grupoId que não é um uuid', () => {
    const result = guestPersonSchema.safeParse({ nomeCompleto: 'Maria', grupoId: 'não-é-um-uuid' })

    expect(result.success).toBe(false)
  })
})

describe('guestPartySyncSchema', () => {
  it('aceita convidado principal sem acompanhantes nem convite', () => {
    const result = guestPartySyncSchema.safeParse({ primary: { nomeCompleto: 'Maria Silva' } })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.companions).toEqual([])
      expect(result.data.removedGuestIds).toEqual([])
    }
  })

  it('aceita convidado principal com acompanhantes e convite', () => {
    const result = guestPartySyncSchema.safeParse({
      primary: { nomeCompleto: 'Maria Silva' },
      companions: [{ nomeCompleto: 'Pedro Silva' }],
      invite: { nome: 'Família Silva' },
    })

    expect(result.success).toBe(true)
  })

  it('rejeita quando o convidado principal não tem nome', () => {
    const result = guestPartySyncSchema.safeParse({ primary: { nomeCompleto: '' } })

    expect(result.success).toBe(false)
  })
})

describe('guestPartyReorderSchema', () => {
  it('aceita partyId + lista de convidados ordenada', () => {
    const result = guestPartyReorderSchema.safeParse({
      partyId: validGroupId,
      orderedGuestIds: [validGroupId],
    })

    expect(result.success).toBe(true)
  })

  it('rejeita lista vazia', () => {
    const result = guestPartyReorderSchema.safeParse({ partyId: validGroupId, orderedGuestIds: [] })

    expect(result.success).toBe(false)
  })
})
