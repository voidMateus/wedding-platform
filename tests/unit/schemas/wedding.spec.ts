import { describe, expect, it } from 'vitest'
import { weddingSettingsSchema } from '#shared/schemas/wedding'
import { DEFAULT_TEXT_COLOR } from '#shared/utils/contrast'

describe('weddingSettingsSchema', () => {
  it('aceita configurações válidas com uma cor que passa no contraste', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      rsvpMode: 'per_group',
      rsvpDeadline: '2026-11-01T00:00',
      primaryColor: DEFAULT_TEXT_COLOR,
    })

    expect(result.success).toBe(true)
  })

  it('rejeita cor em formato inválido', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      rsvpMode: 'per_group',
      primaryColor: 'não-é-hex',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita cor com contraste insuficiente contra o fundo padrão', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      rsvpMode: 'per_group',
      primaryColor: '#a8785c',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita rsvpMode fora do enum', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: 'Ana & João',
      eventDate: '2026-12-12',
      rsvpMode: 'qualquer-coisa',
      primaryColor: DEFAULT_TEXT_COLOR,
    })

    expect(result.success).toBe(false)
  })

  it('rejeita nome do casal vazio', () => {
    const result = weddingSettingsSchema.safeParse({
      coupleNames: '  ',
      eventDate: '2026-12-12',
      rsvpMode: 'per_group',
      primaryColor: DEFAULT_TEXT_COLOR,
    })

    expect(result.success).toBe(false)
  })
})
