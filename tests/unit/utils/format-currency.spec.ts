import { describe, expect, it } from 'vitest'
import { formatCentsToBRL, formatCentsToBRLOrDash } from '#shared/utils/format-currency'

describe('formatCentsToBRL', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(formatCentsToBRL(150000)).toBe('R$ 1.500,00')
  })

  it('formata zero corretamente', () => {
    expect(formatCentsToBRL(0)).toBe('R$ 0,00')
  })

  it('formata valores com centavos quebrados', () => {
    expect(formatCentsToBRL(999)).toBe('R$ 9,99')
  })
})

describe('formatCentsToBRLOrDash', () => {
  it('retorna travessão para null', () => {
    expect(formatCentsToBRLOrDash(null)).toBe('—')
  })

  it('formata normalmente quando não é null', () => {
    expect(formatCentsToBRLOrDash(5000)).toBe('R$ 50,00')
  })
})
