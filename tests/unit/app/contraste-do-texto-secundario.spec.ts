import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WCAG_AA_MIN_CONTRAST, getContrastRatio } from '#shared/utils/contrast'
import { THEME_PRESETS } from '#shared/theme-presets'

/**
 * `--color-text-muted` contra TODOS os fundos em que ele pousa no site público.
 *
 * Este token já falhou três vezes, sempre do mesmo jeito e sempre longe de onde
 * alguém olhava: sobre o gradiente do Hero (4,40:1, relatado em
 * `tests/e2e/utils/a11y.ts`), e depois sobre o tom `accent` das seções da home
 * (4,27:1, medido em `/[slug]` com as seções ligadas). A causa é sempre a
 * mesma: ele passava no fundo liso com margem fina demais, e QUALQUER tinta
 * sobre o fundo comia a sobra.
 *
 * O que torna isso invisível é o tom `accent` ser **derivado**:
 * `color-mix(secondary 10%, surface)`, em `PublicEditorialSection`. A cor
 * secundária é escolhida pelo casal e validada — mas contra a superfície, não
 * contra este par. Ou seja, não existe casamento "inválido" aqui: existe um par
 * que ninguém media.
 *
 * Por isso o teste varre os presets da plataforma E o extremo teórico (uma
 * secundária quase preta): o pior fundo possível não é o do catálogo, é o que
 * um casal pode digitar.
 */

const CSS = readFileSync(join(process.cwd(), 'app', 'assets', 'css', 'main.css'), 'utf8')

function token(nome: string): string {
  // Primeira declaração: a do `@theme`, herdada por todo o site público.
  const match = CSS.match(new RegExp(`${nome}:\\s*(#[0-9a-f]{6})`, 'i'))
  expect(match?.[1], `${nome} não encontrado em main.css`).toBeDefined()
  return match![1]!
}

const TEXT_MUTED = token('--color-text-muted')
const SURFACE = token('--color-surface')
const SURFACE_MUTED = token('--color-surface-muted')

/**
 * O tom `accent` como o CSS o calcula: `color-mix(in srgb, secondary 10%,
 * surface)`. A proporção tem par em `PublicEditorialSection` — mexer lá sem
 * mexer aqui faz este portão medir um fundo que não existe mais.
 */
const PROPORCAO_DA_SECUNDARIA = 0.1

function tomAccent(secundaria: string): string {
  const canal = (i: number) => {
    const s = Number.parseInt(secundaria.slice(1 + i * 2, 3 + i * 2), 16)
    const f = Number.parseInt(SURFACE.slice(1 + i * 2, 3 + i * 2), 16)
    return Math.round(s * PROPORCAO_DA_SECUNDARIA + f * (1 - PROPORCAO_DA_SECUNDARIA))
  }
  return `#${[0, 1, 2].map((i) => canal(i).toString(16).padStart(2, '0')).join('')}`
}

/** O fundo mais escuro que o tom `accent` pode alcançar. */
const SECUNDARIA_MAIS_ESCURA_POSSIVEL = '#000000'

const FUNDOS: Array<[string, string]> = [
  ['superfície', SURFACE],
  ['superfície discreta', SURFACE_MUTED],
  ...THEME_PRESETS.map(
    (preset) =>
      [`accent do preset "${preset.label ?? preset.id}"`, tomAccent(preset.secondaryColor)] as [
        string,
        string,
      ],
  ),
  ['accent no extremo (secundária preta)', tomAccent(SECUNDARIA_MAIS_ESCURA_POSSIVEL)],
]

describe('contraste do texto secundário no site público', () => {
  it.each(FUNDOS)('passa no AA sobre %s', (_onde, fundo) => {
    expect(getContrastRatio(TEXT_MUTED, fundo)).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST)
  })

  /**
   * ... e continua sendo SECUNDÁRIO. Escurecer até resolver o contraste é fácil
   * e destrói a hierarquia: um "muted" que lê igual ao texto principal deixa de
   * separar apoio de conteúdo, e aí a tela toda vira um bloco só.
   */
  it('permanece visivelmente mais claro que o texto principal', () => {
    const principal = token('--color-text')
    expect(getContrastRatio(TEXT_MUTED, SURFACE)).toBeLessThan(
      getContrastRatio(principal, SURFACE) / 2,
    )
  })
})
