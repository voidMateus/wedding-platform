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

/**
 * A capa é a única superfície cujo fundo é CONTEÚDO DO CASAL.
 *
 * O Hero põe `coverImageUrl` a 20% de opacidade sobre `--color-surface-muted`.
 * Uma foto escura — recepção à noite, terno preto — é comum, e nada pode
 * validá-la: é imagem, não cor escolhida num seletor. Então o único piso
 * possível é supor o extremo (foto preta) e exigir que o texto sobreviva a ele.
 *
 * O gradiente do Hero fica de fora de propósito: as duas camadas são BRANCO
 * sobre o fundo, e clarear só aumenta o contraste de texto escuro — medi-las
 * seria medir o caso fácil. O axe as reporta como `incomplete` (não consegue
 * resolver gradiente), e foi isso que por muito tempo fez esta região parecer
 * verde sem nunca ter sido medida.
 */
const OPACIDADE_DA_FOTO_DE_CAPA = 0.2

/** Par em `PublicHero`: a foto entra sobre o tom discreto, não sobre a superfície. */
const BASE_DA_CAPA = SURFACE_MUTED

function capaComFotoPreta(): string {
  const canal = (i: number) => {
    const base = Number.parseInt(BASE_DA_CAPA.slice(1 + i * 2, 3 + i * 2), 16)
    return Math.round(base * (1 - OPACIDADE_DA_FOTO_DE_CAPA))
  }
  return `#${[0, 1, 2].map((i) => canal(i).toString(16).padStart(2, '0')).join('')}`
}

/** O token que `.superficie-da-capa` redefine para o texto secundário do Hero. */
function tokenDaCapa(): string {
  const bloco = CSS.slice(CSS.indexOf('.superficie-da-capa'))
  const match = bloco.match(/--color-text-muted:\s*(#[0-9a-f]{6})/i)
  expect(match?.[1], '--color-text-muted não encontrado em .superficie-da-capa').toBeDefined()
  return match![1]!
}

describe('contraste do texto secundário na capa', () => {
  it('sobrevive à foto de capa mais escura possível', () => {
    expect(getContrastRatio(tokenDaCapa(), capaComFotoPreta())).toBeGreaterThanOrEqual(
      WCAG_AA_MIN_CONTRAST,
    )
  })

  /**
   * O token global NÃO sobrevive — e é exatamente por isso que a capa tem escopo
   * próprio. Se algum dia ele passar a sobreviver, este escopo virou peso morto e
   * deve sair; é o teste que avisa.
   */
  it('e o token global não sobreviveria, que é a razão de o escopo existir', () => {
    expect(getContrastRatio(TEXT_MUTED, capaComFotoPreta())).toBeLessThan(WCAG_AA_MIN_CONTRAST)
  })

  it('continua mais leve que o texto principal dentro da capa', () => {
    const principal = token('--color-text')
    expect(getContrastRatio(tokenDaCapa(), BASE_DA_CAPA)).toBeLessThan(
      getContrastRatio(principal, BASE_DA_CAPA),
    )
  })
})

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
