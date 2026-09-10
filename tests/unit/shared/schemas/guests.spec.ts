import { describe, expect, it } from 'vitest'
import {
  guestPartyGroupSchema,
  guestPartySyncSchema,
  guestPersonSchema,
} from '#shared/schemas/guests'

const validGroupId = '11111111-1111-1111-1111-111111111111'
const otherGuestId = '22222222-2222-2222-2222-222222222222'

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

describe('guestPartySyncSchema — primaryPosition', () => {
  it('assume 0 quando não informada: quem cadastra e adiciona acompanhantes aparece primeiro', () => {
    const result = guestPartySyncSchema.safeParse({ primary: { nomeCompleto: 'Joao' } })

    expect(result.success).toBe(true)
    expect(result.success && result.data.primaryPosition).toBe(0)
  })

  it('aceita uma posição adiante na fila do núcleo', () => {
    const result = guestPartySyncSchema.safeParse({
      primary: { nomeCompleto: 'Maria' },
      companions: [{ nomeCompleto: 'Joao' }],
      primaryPosition: 1,
    })

    expect(result.success).toBe(true)
    expect(result.success && result.data.primaryPosition).toBe(1)
  })

  it('rejeita posição negativa e fracionada — é índice de fila, não medida', () => {
    for (const primaryPosition of [-1, 1.5]) {
      const result = guestPartySyncSchema.safeParse({
        primary: { nomeCompleto: 'Joao' },
        primaryPosition,
      })
      expect(result.success).toBe(false)
    }
  })
})

describe('guestPartyGroupSchema', () => {
  it('aceita dois convidados', () => {
    const result = guestPartyGroupSchema.safeParse({ ids: [validGroupId, otherGuestId] })

    expect(result.success).toBe(true)
  })

  it('rejeita um só — um núcleo de uma pessoa não agrupa nada', () => {
    const result = guestPartyGroupSchema.safeParse({ ids: [validGroupId] })

    expect(result.success).toBe(false)
  })

  it('rejeita id que não é uuid', () => {
    const result = guestPartyGroupSchema.safeParse({ ids: [validGroupId, 'nao-e-uuid'] })

    expect(result.success).toBe(false)
  })
})
