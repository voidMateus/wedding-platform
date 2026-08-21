import type { ThemeConfig } from '#shared/schemas/theme'
import { findFontPair } from '#shared/theme-presets'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '#shared/utils/contrast'

export interface WeddingThemeStyle {
  '--color-primary': string
  '--color-secondary': string
  '--color-heading'?: string
  '--color-body'?: string
  '--font-display'?: string
  '--font-button'?: string
}

/**
 * Resolve config_tema (shape em shared/schemas/theme.ts) para CSS vars
 * (CLAUDE.md, seção 22.3). Função pura, sem estado — chamada tanto pelo
 * layout público (cores + fonte) quanto pelo admin (só cores; --font-sans
 * nunca varia por casamento, CLAUDE.md seção 21).
 *
 * --color-heading/--color-body (modo de cor avançada, Fase Editorial) só
 * entram no objeto quando o casal de fato os definiu — omitidos, o token
 * correspondente cai no default de --color-text já declarado em main.css,
 * em vez de forçar um valor aqui.
 */
export function useWeddingTheme(
  themeConfig: unknown,
  options: { includeFont?: boolean } = {},
): WeddingThemeStyle {
  const theme = (themeConfig ?? {}) as Partial<ThemeConfig>
  const style: WeddingThemeStyle = {
    '--color-primary': theme.primaryColor ?? DEFAULT_PRIMARY_COLOR,
    '--color-secondary': theme.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
  }

  if (theme.titleColor) {
    style['--color-heading'] = theme.titleColor
  }
  if (theme.bodyColor) {
    style['--color-body'] = theme.bodyColor
  }

  if (options.includeFont) {
    const pair = findFontPair(theme.fontPairId)
    if (pair) {
      style['--font-display'] = `'${pair.displayFontFamily}', Georgia, serif`
      if (pair.buttonFontFamily) {
        style['--font-button'] = `'${pair.buttonFontFamily}', var(--font-sans)`
      }
    }
  }

  return style
}
