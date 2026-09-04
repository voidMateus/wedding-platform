import { describe, expect, it } from 'vitest'
import { WCAG_AA_MIN_CONTRAST, getContrastRatio } from '#shared/utils/contrast'

/**
 * Cores de estado da plataforma (--color-danger/success/warning em
 * app/assets/css/main.css). Diferente de primary/secondary, elas NÃO são
 * customizáveis por casamento — então nenhum código valida o contraste delas
 * em runtime, e um ajuste de tom passaria batido. Este teste é o portão: os
 * valores estão duplicados aqui de propósito, para que mexer no CSS sem
 * mexer aqui (ou vice-versa) quebre o build.
 */
const STATE_COLORS = {
  danger: '#b42318',
  success: '#166534',
  warning: '#92400e',
} as const

const DANGER_FOREGROUND = '#ffffff'

// Fundo de página da plataforma inteira, público e admin (--color-surface).
const SURFACE = '#fbf9f5'
// Cartões/painéis em destaque (--color-surface-elevated).
const SURFACE_ELEVATED = '#ffffff'

describe('cores de estado', () => {
  it.each(Object.entries(STATE_COLORS))(
    '%s passa no AA como texto sobre as duas superfícies',
    (_name, hex) => {
      expect(getContrastRatio(hex, SURFACE)).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST)
      expect(getContrastRatio(hex, SURFACE_ELEVATED)).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST)
    },
  )

  it('danger passa no AA como preenchimento sólido (UiButton variant="destructive")', () => {
    expect(getContrastRatio(DANGER_FOREGROUND, STATE_COLORS.danger)).toBeGreaterThanOrEqual(
      WCAG_AA_MIN_CONTRAST,
    )
  })

  // As três precisam ler como "do mesmo sistema": um verde vibrante ao lado de
  // um vermelho escuro entrega que foram escolhidos em momentos diferentes.
  it('as três ficam na mesma faixa de peso visual', () => {
    const ratios = Object.values(STATE_COLORS).map((hex) => getContrastRatio(hex, SURFACE))
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(1.5)
  })
})
