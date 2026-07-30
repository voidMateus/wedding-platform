// Validação de contraste da cor primária do tema (CLAUDE.md, seção 22.4).
// Usado tanto no client (preview em tempo real ao escolher a cor) quanto no
// server (defesa em profundidade antes de salvar theme_config) — por isso
// vive em shared/, não em app/utils/.

export const DEFAULT_SURFACE_COLOR = '#ffffff'
export const DEFAULT_TEXT_COLOR = '#2b2622'
export const DEFAULT_PRIMARY_COLOR = '#a8785c'
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

export interface PrimaryColorContrastResult {
  ratioAgainstSurface: number
  ratioAgainstText: number
  meetsMinimum: boolean
}

/**
 * A cor primária é usada tanto como fundo (ex: botões — precisa contrastar
 * com o texto que fica sobre ela) quanto como texto/destaque sobre a
 * superfície padrão — por isso validamos contra os dois tokens fixos
 * (CLAUDE.md, seção 22.3: só a cor primária é customizável, não
 * surface/text).
 */
export function checkPrimaryColorContrast(primaryColorHex: string): PrimaryColorContrastResult {
  const ratioAgainstSurface = getContrastRatio(primaryColorHex, DEFAULT_SURFACE_COLOR)
  const ratioAgainstText = getContrastRatio(primaryColorHex, DEFAULT_TEXT_COLOR)

  return {
    ratioAgainstSurface,
    ratioAgainstText,
    meetsMinimum: ratioAgainstSurface >= WCAG_AA_MIN_CONTRAST,
  }
}
