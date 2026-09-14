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
    'preset "$label": primaryColor, secondaryColor e titleColor são hex válidos e passam no contraste WCAG AA',
    (preset) => {
      // titleColor entra na mesma régua das outras duas, e NÃO na isenção do
      // ornamento: título é texto de conteúdo, não decoração.
      for (const cor of [preset.primaryColor, preset.secondaryColor, preset.titleColor]) {
        if (cor === undefined) continue
        expect(isValidHexColor(cor)).toBe(true)
        expect(checkColorContrast(cor).meetsMinimum).toBe(true)
      }
    },
  )

  it('todo preset define a cor do título', () => {
    // Sem ela os nomes do casal — o maior elemento da página — sairiam do mesmo
    // `--color-text` nos nove presets, e a paleta só pintaria o botão e o
    // ornamento. Era metade do motivo de o catálogo antigo parecer repetido.
    for (const preset of THEME_PRESETS) {
      expect(preset.titleColor, `preset "${preset.label}" sem titleColor`).toBeTruthy()
    }
  })

  it('as primárias cobrem o círculo de cor, em vez de se amontoarem numa família', () => {
    // O catálogo anterior tinha QUATRO primárias num único sextante (o do
    // vinho) e ocupava só quatro dos seis — cinco variações de "vinho +
    // dourado" separadas apenas pela fonte. Este teste é o que impede a volta
    // disso sem alguém decidir explicitamente.
    //
    // A medida é o sextante, e não a distância entre matizes vizinhas: Rosé
    // (H=342) e Borgonha (H=345) são vizinhos de matiz e inconfundíveis na
    // tela, porque diferem em luminosidade e saturação. Matiz sozinha é a
    // métrica errada para "parecidos".
    const porSextante = new Map<number, number>()
    for (const preset of THEME_PRESETS) {
      const sextante = Math.floor(matizDe(preset.primaryColor) / 60)
      porSextante.set(sextante, (porSextante.get(sextante) ?? 0) + 1)
    }

    expect(porSextante.size).toBeGreaterThanOrEqual(5)
    expect(Math.max(...porSextante.values())).toBeLessThanOrEqual(3)
  })

  it('nenhuma cor secundária se repete mais de duas vezes', () => {
    // Quatro presets dividindo o mesmo dourado foi metade do motivo de o
    // catálogo antigo parecer um só. Duas ainda é combinação clássica
    // (borgonha e marinho com dourado); três é falta de curadoria.
    const contagem = new Map<string, number>()
    for (const preset of THEME_PRESETS) {
      const cor = preset.secondaryColor.toLowerCase()
      contagem.set(cor, (contagem.get(cor) ?? 0) + 1)
    }

    for (const [cor, vezes] of contagem) {
      expect(vezes, `a secundária ${cor} aparece ${vezes} vezes`).toBeLessThanOrEqual(2)
    }
  })

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

/** Matiz (0-360) de um hex — só para o teste de espalhamento do catálogo. */
function matizDe(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 0
  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  return Math.round(h * 60 + (h < 0 ? 360 : 0))
}
