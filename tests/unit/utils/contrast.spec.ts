import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SURFACE_COLOR,
  DEFAULT_TEXT_COLOR,
  WCAG_AA_MIN_CONTRAST,
  checkPrimaryColorContrast,
  getContrastRatio,
  isValidHexColor,
} from '#shared/utils/contrast'

describe('isValidHexColor', () => {
  it('aceita hex de 6 dígitos', () => {
    expect(isValidHexColor('#a8785c')).toBe(true)
  })

  it('aceita hex de 3 dígitos', () => {
    expect(isValidHexColor('#fff')).toBe(true)
  })

  it('rejeita valores sem #', () => {
    expect(isValidHexColor('a8785c')).toBe(false)
  })

  it('rejeita valores inválidos', () => {
    expect(isValidHexColor('#zzzzzz')).toBe(false)
  })
})

describe('getContrastRatio', () => {
  it('preto contra branco dá o contraste máximo (21:1)', () => {
    expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('uma cor contra ela mesma dá contraste 1:1', () => {
    expect(getContrastRatio('#a8785c', '#a8785c')).toBeCloseTo(1, 1)
  })

  it('é simétrico (ordem dos argumentos não importa)', () => {
    const a = getContrastRatio('#a8785c', '#ffffff')
    const b = getContrastRatio('#ffffff', '#a8785c')
    expect(a).toBeCloseTo(b, 5)
  })
})

describe('checkPrimaryColorContrast', () => {
  it('DEFAULT_TEXT_COLOR contra o fundo padrão passa no mínimo do WCAG AA', () => {
    const result = checkPrimaryColorContrast(DEFAULT_TEXT_COLOR)
    expect(result.ratioAgainstSurface).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST)
    expect(result.meetsMinimum).toBe(true)
  })

  it('branco contra branco não passa (contraste 1:1)', () => {
    const result = checkPrimaryColorContrast(DEFAULT_SURFACE_COLOR)
    expect(result.meetsMinimum).toBe(false)
  })

  it('a cor de exemplo do CLAUDE.md (#a8785c) NÃO atinge 4.5:1 contra branco', () => {
    // Achado real ao implementar a validação (CLAUDE.md, seção 22.4): o
    // valor de exemplo usado na seção 22.1 fica em ~3.8:1, abaixo do
    // mínimo exigido pela própria seção 22.4. Este teste documenta o
    // comportamento atual — não "corrige" a cor por conta própria, já que
    // trocar a cor de marca é uma decisão de produto, não de arquitetura.
    const result = checkPrimaryColorContrast('#a8785c')
    expect(result.ratioAgainstSurface).toBeLessThan(WCAG_AA_MIN_CONTRAST)
    expect(result.meetsMinimum).toBe(false)
  })
})
