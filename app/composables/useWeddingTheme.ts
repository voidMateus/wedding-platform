import type { ThemeConfig } from '#shared/schemas/theme'
import { findFontPair } from '#shared/theme-presets'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '#shared/utils/contrast'

export interface WeddingThemeStyle {
  '--color-primary': string
  '--color-secondary': string
  '--font-display'?: string
}

/**
 * Resolve theme_config (shape em shared/schemas/theme.ts) para CSS vars
 * (CLAUDE.md, seção 22.3). Função pura, sem estado — chamada tanto pelo
 * layout público (cores + fonte) quanto pelo admin (só cores; --font-sans
 * nunca varia por casamento, CLAUDE.md seção 21).
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

  if (options.includeFont) {
    const pair = findFontPair(theme.fontPairId)
    if (pair) {
      style['--font-display'] = `'${pair.displayFontFamily}', Georgia, serif`
    }
  }

  return style
}
