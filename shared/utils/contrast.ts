// Validação de contraste da cor primária do tema (CLAUDE.md, seção 22.4).
// Usado tanto no client (preview em tempo real ao escolher a cor) quanto no
// server (defesa em profundidade antes de salvar config_tema) — por isso
// vive em shared/, não em app/utils/.

export const DEFAULT_SURFACE_COLOR = '#ffffff'
export const DEFAULT_TEXT_COLOR = '#2b2622'
// #a8785c (o valor de exemplo original do CLAUDE.md, seção 22.1) fica em
// ~3.81:1 contra --color-surface — abaixo do mínimo exigido pela própria
// seção 22.4 (achado documentado, ver tests/unit/utils/contrast.spec.ts).
// #6b4a35 é a cor primária do preset "Clássico Elegante" (shared/theme-
// presets.ts, Fase Visual) — mesma família de tom, mas corrigida para
// passar no contraste mínimo.
export const DEFAULT_PRIMARY_COLOR = '#6b4a35'
export const DEFAULT_SECONDARY_COLOR = '#5f6f52'
export const WCAG_AA_MIN_CONTRAST = 4.5

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex

  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)
  return { r, g, b }
}

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const R = srgbChannelToLinear(r)
  const G = srgbChannelToLinear(g)
  const B = srgbChannelToLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/** Fórmula de contraste do WCAG 2.1 (razão de luminância relativa). */
export function getContrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA)
  const luminanceB = relativeLuminance(hexB)
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

export interface ColorContrastResult {
  ratioAgainstSurface: number
  ratioAgainstText: number
  meetsMinimum: boolean
}

/**
 * Valida uma cor da paleta do casal (primária ou secundária — CLAUDE.md,
 * seção 22.3, Fase Visual) contra os dois tokens fixos da superfície/texto
 * padrão. Cada cor da paleta é usada tanto como fundo (ex: botões — precisa
 * contrastar com o texto que fica sobre ela) quanto como texto/destaque
 * sobre a superfície padrão — nunca surface/text em si, que permanecem
 * fixos.
 */
export function checkColorContrast(colorHex: string): ColorContrastResult {
  const ratioAgainstSurface = getContrastRatio(colorHex, DEFAULT_SURFACE_COLOR)
  const ratioAgainstText = getContrastRatio(colorHex, DEFAULT_TEXT_COLOR)

  return {
    ratioAgainstSurface,
    ratioAgainstText,
    meetsMinimum: ratioAgainstSurface >= WCAG_AA_MIN_CONTRAST,
  }
}
