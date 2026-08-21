import { describe, expect, it } from 'vitest'
import { photoMetadataSchema } from '#shared/schemas/photos'

describe('photoMetadataSchema', () => {
  it('aceita legenda e ordem válidas', () => {
    const result = photoMetadataSchema.safeParse({ legenda: 'Ensaio pré-wedding', ordemExibicao: 2 })
    expect(result.success).toBe(true)
  })

  it('aceita legenda ausente (string vazia)', () => {
    const result = photoMetadataSchema.safeParse({ legenda: '', ordemExibicao: 0 })
    expect(result.success).toBe(true)
  })

  it('usa ordemExibicao=0 como default quando ausente', () => {
    const result = photoMetadataSchema.safeParse({ legenda: 'Foto' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ordemExibicao).toBe(0)
    }
  })

  it('rejeita ordemExibicao negativo', () => {
    const result = photoMetadataSchema.safeParse({ legenda: 'Foto', ordemExibicao: -1 })
    expect(result.success).toBe(false)
  })

  it('rejeita legenda acima do limite de 200 caracteres', () => {
    const result = photoMetadataSchema.safeParse({ legenda: 'a'.repeat(201), ordemExibicao: 0 })
    expect(result.success).toBe(false)
  })

  it('usa focoX/focoY=50 (centro) como default quando ausentes', () => {
    const result = photoMetadataSchema.safeParse({ legenda: 'Foto' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.focoX).toBe(50)
      expect(result.data.focoY).toBe(50)
    }
  })

  it('aceita focoX/focoY dentro do intervalo 0-100', () => {
    const result = photoMetadataSchema.safeParse({ legenda: 'Foto', focoX: 20, focoY: 80 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.focoX).toBe(20)
      expect(result.data.focoY).toBe(80)
    }
  })

  it('rejeita focoX/focoY fora do intervalo 0-100', () => {
    expect(photoMetadataSchema.safeParse({ legenda: 'Foto', focoX: 101 }).success).toBe(false)
    expect(photoMetadataSchema.safeParse({ legenda: 'Foto', focoY: -1 }).success).toBe(false)
  })
})
