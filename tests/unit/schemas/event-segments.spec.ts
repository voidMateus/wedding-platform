import { describe, expect, it } from 'vitest'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'

describe('eventSegmentInputSchema', () => {
  it('aceita um item válido com todos os campos', () => {
    const result = eventSegmentInputSchema.safeParse({
      title: 'Cerimônia',
      venueName: 'Igreja São José',
      venueAddress: 'Rua das Flores, 100',
      startsAt: '2026-12-12T16:00',
      endsAt: '2026-12-12T17:00',
      displayOrder: 1,
    })

    expect(result.success).toBe(true)
  })

  it('aceita um item só com título (demais campos opcionais)', () => {
    const result = eventSegmentInputSchema.safeParse({ title: 'Cerimônia' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayOrder).toBe(0)
    }
  })

  it('rejeita título vazio', () => {
    const result = eventSegmentInputSchema.safeParse({ title: '  ' })

    expect(result.success).toBe(false)
  })

  it('rejeita data/hora de início inválida', () => {
    const result = eventSegmentInputSchema.safeParse({
      title: 'Cerimônia',
      startsAt: 'não-é-uma-data',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita displayOrder negativo', () => {
    const result = eventSegmentInputSchema.safeParse({ title: 'Cerimônia', displayOrder: -1 })

    expect(result.success).toBe(false)
  })
})
