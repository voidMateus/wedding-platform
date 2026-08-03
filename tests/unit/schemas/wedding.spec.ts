import { describe, expect, it } from 'vitest'
import { weddingSettingsSchema } from '#shared/schemas/wedding'

describe('weddingSettingsSchema', () => {
  it('aceita configurações válidas', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      rsvpDeadline: '2026-11-01T00:00',
      childMaxAge: 11,
      guestListMode: 'closed',
    })

    expect(result.success).toBe(true)
  })

  it('aceita eventTime válido (HH:MM)', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      eventTime: '16:00',
      childMaxAge: 11,
      guestListMode: 'closed',
    })

    expect(result.success).toBe(true)
  })

  it('aceita eventTime ausente (contagem regressiva usa meia-noite como fallback)', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      childMaxAge: 11,
      guestListMode: 'closed',
    })

    expect(result.success).toBe(true)
  })

  it('rejeita eventTime em formato inválido', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      eventTime: 'às quatro da tarde',
      childMaxAge: 11,
      guestListMode: 'closed',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita guestListMode fora do enum', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      childMaxAge: 11,
      guestListMode: 'qualquer-coisa',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita nome do casal vazio', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: '  ',
      eventDate: '2026-12-12',
      childMaxAge: 11,
      guestListMode: 'closed',
    })

    expect(result.success).toBe(false)
  })
})
