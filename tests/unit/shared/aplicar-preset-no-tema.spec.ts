import { describe, expect, it } from 'vitest'
import { THEME_PRESETS, aplicarPresetNoTema } from '#shared/theme-presets'
import { themeConfigSchema } from '#shared/schemas/theme'

/**
 * O tema de um casamento recém-criado é `{}`.
 *
 * Aplicar um preset sobre ele precisa produzir um objeto que passa pelo schema
 * — `showCountdown` é obrigatório e não tem default, e o wizard de Primeiros
 * passos montava o objeto à mão. O sintoma era um toast genérico de "não foi
 * possível salvar esta etapa" sem nenhuma requisição ter saído.
 */
describe('aplicarPresetNoTema', () => {
  const preset = THEME_PRESETS[0]!

  it('produz um tema válido a partir de config_tema vazio', () => {
    for (const temaVazio of [undefined, null, {}]) {
      const resultado = themeConfigSchema.safeParse(aplicarPresetNoTema(temaVazio, preset))
      expect(resultado.success, JSON.stringify(resultado.error?.issues)).toBe(true)
    }
  })

  it('todo preset do catálogo produz um tema válido', () => {
    for (const cadaPreset of THEME_PRESETS) {
      expect(themeConfigSchema.safeParse(aplicarPresetNoTema({}, cadaPreset)).success).toBe(true)
    }
  })

  it('liga a contagem regressiva por padrão, e respeita quem desligou', () => {
    expect(aplicarPresetNoTema({}, preset).showCountdown).toBe(true)
    expect(aplicarPresetNoTema({ showCountdown: false }, preset).showCountdown).toBe(false)
  })

  it('preserva o que o preset não decide', () => {
    const resultado = aplicarPresetNoTema(
      { activeSections: ['historia'], coverImageUrl: 'https://exemplo/capa.jpg' },
      preset,
    )
    expect(resultado.activeSections).toEqual(['historia'])
    expect(resultado.coverImageUrl).toBe('https://exemplo/capa.jpg')
  })

  it('preset sem ornamento limpa o campo em vez de herdar o do anterior', () => {
    const semOrnamento = THEME_PRESETS.find((p) => !p.ornamentColor)
    if (!semOrnamento) return
    expect(aplicarPresetNoTema({ ornamentColor: '#d4af37' }, semOrnamento).ornamentColor).toBe('')
  })
})
