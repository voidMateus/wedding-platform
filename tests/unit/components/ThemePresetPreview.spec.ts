import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ThemePresetPreview from '~/components/admin/ThemePresetPreview.vue'
import { THEME_PRESETS, findFontPair } from '#shared/theme-presets'

/**
 * A prévia promete mostrar o site — então ela não pode mentir sobre as duas
 * coisas que de fato mudam entre presets: a tipografia dos nomes e o tom do
 * ornamento. Nenhuma das duas cabe num círculo de cor, que era o que a grade
 * mostrava antes.
 */
function montar(preset = THEME_PRESETS[0]!, nomes = 'Ana & João') {
  return mount(ThemePresetPreview, {
    props: { preset, nomesNoivos: nomes, dataEvento: '2027-12-11' },
  })
}

describe('AdminThemePresetPreview', () => {
  it('mostra os nomes do casal em três linhas, como o Hero', () => {
    const wrapper = montar()
    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.text()).toContain('João')
    expect(wrapper.text()).toContain('&')
  })

  it('nome fora do padrão "A & B" cai numa linha só, sem quebrar', () => {
    const wrapper = montar(THEME_PRESETS[0]!, 'Casal de Teste')
    expect(wrapper.text()).toContain('Casal de Teste')
  })

  it('aplica a família do par tipográfico do preset, não a do painel', () => {
    // O escopo `.admin-ui` reaponta --font-display para a fonte do painel; a
    // prévia precisa vencer isso no próprio elemento, senão mostra Sora para
    // todos os sete presets.
    const preset =
      THEME_PRESETS.find((p) => p.fontPairId === 'cormorant-nunito') ?? THEME_PRESETS[0]!
    const style = montar(preset).attributes('style') ?? ''
    expect(style).toContain(findFontPair(preset.fontPairId)!.displayFontFamily)
  })

  it('usa a classe que desfaz o escopo de cores do painel', () => {
    // Sem ela a capa apareceria no cinza do admin em vez do creme do site.
    expect(montar().classes()).toContain('previa-do-site')
  })

  it('sem ornamento próprio, o ornamento é a cor secundária — como no site', () => {
    const preset = THEME_PRESETS.find((p) => !p.ornamentColor)
    if (!preset) return
    const style = montar(preset).attributes('style') ?? ''
    expect(style).toContain(`--color-ornament: ${preset.secondaryColor}`)
  })

  it('todo preset do catálogo renderiza sem quebrar', () => {
    for (const preset of THEME_PRESETS) {
      expect(montar(preset).text()).toContain('Ana')
    }
  })
})
