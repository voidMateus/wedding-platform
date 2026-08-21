import { describe, expect, it } from 'vitest'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'

describe('eventSegmentInputSchema', () => {
  it('aceita um item válido com todos os campos', () => {
    const result = eventSegmentInputSchema.safeParse({
      titulo: 'Cerimônia',
      nomeLocal: 'Igreja São José',
      enderecoLocal: 'Rua das Flores, 100',
      iniciaEm: '2026-12-12T16:00',
      terminaEm: '2026-12-12T17:00',
      ordemExibicao: 1,
    })

    expect(result.success).toBe(true)
  })

  it('aceita um item só com título (demais campos opcionais)', () => {
    const result = eventSegmentInputSchema.safeParse({ titulo: 'Cerimônia' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ordemExibicao).toBe(0)
    }
  })

  it('rejeita título vazio', () => {
    const result = eventSegmentInputSchema.safeParse({ titulo: '  ' })

    expect(result.success).toBe(false)
  })

  it('rejeita data/hora de início inválida', () => {
    const result = eventSegmentInputSchema.safeParse({
      titulo: 'Cerimônia',
      iniciaEm: 'não-é-uma-data',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita ordemExibicao negativo', () => {
    const result = eventSegmentInputSchema.safeParse({ titulo: 'Cerimônia', ordemExibicao: -1 })

    expect(result.success).toBe(false)
  })

  it('aceita latitude/longitude válidas', () => {
    const result = eventSegmentInputSchema.safeParse({
      titulo: 'Cerimônia',
      latitudeLocal: -15.601398,
      longitudeLocal: -56.097892,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.latitudeLocal).toBeCloseTo(-15.601398)
      expect(result.data.longitudeLocal).toBeCloseTo(-56.097892)
    }
  })

  it('trata latitude/longitude como string vazia = não definido (não vira 0,0)', () => {
    const result = eventSegmentInputSchema.safeParse({
      titulo: 'Cerimônia',
      latitudeLocal: '',
      longitudeLocal: '',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.latitudeLocal).toBeUndefined()
      expect(result.data.longitudeLocal).toBeUndefined()
    }
  })

  it('aceita latitude/longitude enviadas como string (formulário HTML)', () => {
    const result = eventSegmentInputSchema.safeParse({
      titulo: 'Cerimônia',
      latitudeLocal: '-15.6',
      longitudeLocal: '-56.1',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.latitudeLocal).toBeCloseTo(-15.6)
      expect(result.data.longitudeLocal).toBeCloseTo(-56.1)
    }
  })

  it('rejeita latitude fora do intervalo -90..90', () => {
    const result = eventSegmentInputSchema.safeParse({ titulo: 'Cerimônia', latitudeLocal: 95 })

    expect(result.success).toBe(false)
  })

  it('rejeita longitude fora do intervalo -180..180', () => {
    const result = eventSegmentInputSchema.safeParse({ titulo: 'Cerimônia', longitudeLocal: 200 })

    expect(result.success).toBe(false)
  })

  it('aceita mesmoLocalQue como um uuid válido', () => {
    const result = eventSegmentInputSchema.safeParse({
      titulo: 'Recepção',
      mesmoLocalQue: '11111111-1111-1111-1111-111111111111',
    })

    expect(result.success).toBe(true)
  })

  it('aceita mesmoLocalQue ausente ou vazio (endereço próprio)', () => {
    const result = eventSegmentInputSchema.safeParse({ titulo: 'Cerimônia', mesmoLocalQue: '' })

    expect(result.success).toBe(true)
  })

  it('rejeita mesmoLocalQue que não é um uuid', () => {
    const result = eventSegmentInputSchema.safeParse({ titulo: 'Recepção', mesmoLocalQue: 'não-é-um-uuid' })

    expect(result.success).toBe(false)
  })
})
