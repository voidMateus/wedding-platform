import { describe, expect, it } from 'vitest'
import { DEFAULT_SECTION_SPACING, SECTION_SPACING_CLASSES } from '#shared/section-spacing'

describe('SECTION_SPACING_CLASSES', () => {
  it('define as 5 densidades (xs, sm, md, lg, xl)', () => {
    expect(Object.keys(SECTION_SPACING_CLASSES).sort()).toEqual(['lg', 'md', 'sm', 'xl', 'xs'])
  })

  it('o default ("md") reproduz o padding usado desde a Fase Editorial', () => {
    expect(DEFAULT_SECTION_SPACING).toBe('md')
    expect(SECTION_SPACING_CLASSES.md).toBe('py-20 sm:py-28')
  })

  it('cada densidade tem um valor de classe não vazio e distinto das demais', () => {
    const values = Object.values(SECTION_SPACING_CLASSES)
    expect(new Set(values).size).toBe(values.length)
    for (const value of values) {
      expect(value.length).toBeGreaterThan(0)
    }
  })
})
