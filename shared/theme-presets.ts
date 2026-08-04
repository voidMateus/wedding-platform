// Catálogo de temas prontos e pares tipográficos (CLAUDE.md, seção 22.1/22.3
// — Fase Visual). Presets são um atalho: escolher um preenche
// primaryColor/secondaryColor/fontPairId de uma vez, mas cada peça continua
// editável isoladamente depois (a fonte é uma escolha independente da cor,
// não só embutida dentro do preset — ver FontPairPicker.vue).
//
// Toda cor de todo preset é coberta pelo teste de integridade em
// tests/unit/theme-presets.spec.ts, que garante checkColorContrast(...).
// meetsMinimum para as duas cores de cada entrada — nenhum preset pode
// repetir o problema documentado com o #a8785c original do CLAUDE.md.

export interface ThemePreset {
  id: string
  label: string
  primaryColor: string
  secondaryColor: string
  fontPairId: string
}

export interface FontPair {
  id: string
  label: string
  displayFontFamily: string
  bodyFontFamily: string
  /** Fonte de botões/CTAs (--font-button) — opcional; sem ela, botões herdam bodyFontFamily via --font-sans. */
  buttonFontFamily?: string
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'playfair-inter',
    label: 'Playfair Display + Inter',
    displayFontFamily: 'Playfair Display',
    bodyFontFamily: 'Inter',
  },
  {
    id: 'cormorant-nunito',
    label: 'Cormorant Garamond + Nunito Sans',
    displayFontFamily: 'Cormorant Garamond',
    bodyFontFamily: 'Nunito Sans',
  },
  {
    id: 'dmserif-dmsans',
    label: 'DM Serif Display + DM Sans',
    displayFontFamily: 'DM Serif Display',
    bodyFontFamily: 'DM Sans',
  },
  {
    id: 'abril-worksans',
    label: 'Abril Fatface + Work Sans',
    displayFontFamily: 'Abril Fatface',
    bodyFontFamily: 'Work Sans',
  },
  {
    id: 'librebaskerville-karla',
    label: 'Libre Baskerville + Karla',
    displayFontFamily: 'Libre Baskerville',
    bodyFontFamily: 'Karla',
  },
  {
    id: 'cinzel-inter-montserrat',
    label: 'Cinzel + Inter (botões em Montserrat)',
    displayFontFamily: 'Cinzel',
    bodyFontFamily: 'Inter',
    buttonFontFamily: 'Montserrat',
  },
  {
    id: 'cormorant-inter',
    label: 'Cormorant Garamond + Inter',
    displayFontFamily: 'Cormorant Garamond',
    bodyFontFamily: 'Inter',
  },
]

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classico-elegante',
    label: 'Clássico Elegante',
    primaryColor: '#6b4a35',
    secondaryColor: '#5f6f52',
    fontPairId: 'playfair-inter',
  },
  {
    id: 'borgonha-editorial',
    label: 'Borgonha Editorial',
    primaryColor: '#5c1a2b',
    secondaryColor: '#8a6a1f',
    fontPairId: 'dmserif-dmsans',
  },
  {
    id: 'romantico-pastel',
    label: 'Romântico',
    primaryColor: '#a15c6b',
    secondaryColor: '#7d6529',
    fontPairId: 'cormorant-nunito',
  },
  {
    id: 'moderno-minimalista',
    label: 'Moderno Minimalista',
    primaryColor: '#2f4858',
    secondaryColor: '#5c5450',
    fontPairId: 'dmserif-dmsans',
  },
  {
    id: 'ousado-contrastante',
    label: 'Ousado',
    primaryColor: '#6e2439',
    secondaryColor: '#8a6d1f',
    fontPairId: 'abril-worksans',
  },
  {
    id: 'natural-organico',
    label: 'Natural Orgânico',
    primaryColor: '#3f5b3f',
    secondaryColor: '#a35d3a',
    fontPairId: 'librebaskerville-karla',
  },
  {
    id: 'vermelho-classico',
    label: 'Vermelho Clássico',
    primaryColor: '#dc2626',
    secondaryColor: '#7f1d1d',
    fontPairId: 'cinzel-inter-montserrat',
  },
  // "Convite de Luxo" (Fase Linguagem Visual, Rodada 6) — borgonha profundo
  // + dourado fosco sobre marfim, brief explícito do usuário inspirado em
  // marcas de luxo. O dourado do brief (#C8A56A) não passa no contraste
  // mínimo (≈2.3:1, seção 22.4) — usa o mesmo dourado fosco escuro já
  // validado do preset borgonha-editorial; ornamentos decorativos clareiam
  // via opacidade, sem burlar a validação de texto.
  {
    id: 'convite-luxo',
    label: 'Convite de Luxo',
    primaryColor: '#7a1f24',
    secondaryColor: '#8a6a1f',
    fontPairId: 'cormorant-inter',
  },
]

export const DEFAULT_THEME_PRESET_ID = 'classico-elegante'
export const DEFAULT_FONT_PAIR_ID = 'playfair-inter'

export function findThemePreset(presetId: string | undefined): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === presetId)
}

export function findFontPair(fontPairId: string | undefined): FontPair | undefined {
  return FONT_PAIRS.find((pair) => pair.id === fontPairId)
}
