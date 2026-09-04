import { describe, expect, it } from 'vitest'
import {
  formatCentsToAmount,
  formatCentsToBRL,
  formatCentsToBRLOrDash,
} from '#shared/utils/format-currency'

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

describe('formatCentsToAmount', () => {
  it('formata sem o símbolo da moeda', () => {
    expect(formatCentsToAmount(150000)).toBe('1.500,00')
  })

  it('mantém as duas casas decimais em valores pequenos', () => {
    expect(formatCentsToAmount(1)).toBe('0,01')
  })
})
