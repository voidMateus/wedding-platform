import { describe, expect, it } from 'vitest'
import { useWeddingTheme } from '~/composables/useWeddingTheme'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '#shared/utils/contrast'

describe('useWeddingTheme', () => {
  it('usa as cores default quando theme_config é null', () => {
    const style = useWeddingTheme(null)
    expect(style['--color-primary']).toBe(DEFAULT_PRIMARY_COLOR)
    expect(style['--color-secondary']).toBe(DEFAULT_SECONDARY_COLOR)
    expect(style['--font-display']).toBeUndefined()
  })

  it('resolve as cores customizadas do casamento', () => {
    const style = useWeddingTheme({ primaryColor: '#6e2439', secondaryColor: '#8a6d1f' })
    expect(style['--color-primary']).toBe('#6e2439')
    expect(style['--color-secondary']).toBe('#8a6d1f')
  })

  it('não inclui --font-display quando includeFont não é passado (uso no admin)', () => {
    const style = useWeddingTheme({ fontPairId: 'abril-worksans' })
    expect(style['--font-display']).toBeUndefined()
  })

  it('resolve --font-display a partir do fontPairId quando includeFont é true (uso no site público)', () => {
    const style = useWeddingTheme({ fontPairId: 'abril-worksans' }, { includeFont: true })
    expect(style['--font-display']).toBe("'Abril Fatface', Georgia, serif")
  })

  it('ignora fontPairId desconhecido sem quebrar', () => {
    const style = useWeddingTheme({ fontPairId: 'não-existe' }, { includeFont: true })
    expect(style['--font-display']).toBeUndefined()
  })

  it('não inclui --color-heading/--color-body quando o casal não definiu cor avançada', () => {
    const style = useWeddingTheme({ primaryColor: '#6e2439', secondaryColor: '#8a6d1f' })
    expect(style['--color-heading']).toBeUndefined()
    expect(style['--color-body']).toBeUndefined()
  })

  it('resolve --color-heading/--color-body quando o casal define cor avançada', () => {
    const style = useWeddingTheme({ titleColor: '#2b2622', bodyColor: '#3a332c' })
    expect(style['--color-heading']).toBe('#2b2622')
    expect(style['--color-body']).toBe('#3a332c')
  })
})
