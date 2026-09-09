import { describe, expect, it } from 'vitest'
import { FONT_PAIRS, THEME_PRESETS, findFontPair, findThemePreset } from '#shared/theme-presets'
import { checkColorContrast, checkOrnamentOnPrimary, isValidHexColor } from '#shared/utils/contrast'

describe('THEME_PRESETS', () => {
  it('tem pelo menos 5 presets (mix variado de estilos)', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(5)
  })

  it('cada preset tem ids únicos', () => {
    const ids = THEME_PRESETS.map((preset) => preset.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(THEME_PRESETS)(
    'preset "$label": primaryColor e secondaryColor são hex válidos e passam no contraste WCAG AA',
    (preset) => {
      expect(isValidHexColor(preset.primaryColor)).toBe(true)
      expect(isValidHexColor(preset.secondaryColor)).toBe(true)
      expect(checkColorContrast(preset.primaryColor).meetsMinimum).toBe(true)
      expect(checkColorContrast(preset.secondaryColor).meetsMinimum).toBe(true)
    },
  )

  it.each(THEME_PRESETS)('preset "$label" referencia um fontPairId existente', (preset) => {
    expect(findFontPair(preset.fontPairId)).toBeDefined()
  })

  it('nenhum preset repete o #a8785c original (achado documentado em contrast.spec.ts)', () => {
    for (const preset of THEME_PRESETS) {
      expect(preset.primaryColor.toLowerCase()).not.toBe('#a8785c')
    }
  })
})

describe('FONT_PAIRS', () => {
  it('tem ids únicos', () => {
    const ids = FONT_PAIRS.map((pair) => pair.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('findThemePreset / findFontPair', () => {
  it('retorna undefined para um id inexistente', () => {
    expect(findThemePreset('não-existe')).toBeUndefined()
    expect(findFontPair('não-existe')).toBeUndefined()
  })

  it('retorna o preset/par correto para um id válido', () => {
    expect(findThemePreset('classico-elegante')?.label).toBe('Clássico Elegante')
    expect(findFontPair('playfair-inter')?.displayFontFamily).toBe('Playfair Display')
  })
})

describe('THEME_PRESETS — cor de ornamento', () => {
  const withOrnament = THEME_PRESETS.filter((preset) => preset.ornamentColor)

  it('existe ao menos um preset com ornamento próprio', () => {
    expect(withOrnament.length).toBeGreaterThan(0)
  })

  it.each(withOrnament)('preset "$label": ornamentColor é um hex válido', (preset) => {
    expect(isValidHexColor(preset.ornamentColor!)).toBe(true)
  })

  it.each(withOrnament)(
    'preset "$label": o ornamento é legível sobre a primária (par do Versículo)',
    (preset) => {
      // O ornamento é isento de contraste como decoração, mas no Versículo ele
      // vira texto sobre a cor primária. Um preset da plataforma não pode sair
      // de fábrica com essa combinação reprovada — a isenção existe para a
      // cor do casal, não para relaxar os presets.
      expect(checkOrnamentOnPrimary(preset.ornamentColor!, preset.primaryColor).meetsMinimum).toBe(
        true,
      )
    },
  )
})
