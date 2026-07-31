import { describe, expect, it } from 'vitest'
import { photoMetadataSchema } from '#shared/schemas/photos'

describe('photoMetadataSchema', () => {
  it('aceita legenda e ordem válidas', () => {
    const result = photoMetadataSchema.safeParse({ caption: 'Ensaio pré-wedding', displayOrder: 2 })
    expect(result.success).toBe(true)
  })

  it('aceita legenda ausente (string vazia)', () => {
    const result = photoMetadataSchema.safeParse({ caption: '', displayOrder: 0 })
    expect(result.success).toBe(true)
  })

  it('usa displayOrder=0 como default quando ausente', () => {
    const result = photoMetadataSchema.safeParse({ caption: 'Foto' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayOrder).toBe(0)
    }
  })

  it('rejeita displayOrder negativo', () => {
    const result = photoMetadataSchema.safeParse({ caption: 'Foto', displayOrder: -1 })
    expect(result.success).toBe(false)
  })

  it('rejeita legenda acima do limite de 200 caracteres', () => {
    const result = photoMetadataSchema.safeParse({ caption: 'a'.repeat(201), displayOrder: 0 })
    expect(result.success).toBe(false)
  })
})
