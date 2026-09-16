import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WCAG_AA_MIN_CONTRAST, getContrastRatio } from '#shared/utils/contrast'

/**
 * A cor da plataforma (`.marca-da-plataforma`, em `app/assets/css/main.css`).
 *
 * Ela vale nas três telas em que nenhum evento está aberto — login, lista de
 * eventos da conta e painel interno —, enquanto dentro de `/admin/{slug}` a
 * primária é a do casamento. Como nenhuma tela a deixa editar, nada valida o
 * contraste dela em runtime, e um ajuste de tom passaria batido — o mesmo risco
 * das cores de estado (`state-colors.spec.ts`).
 *
 * A diferença para aquele teste é que aqui os valores são LIDOS do CSS em vez
 * de repetidos: lá a cópia de `--color-surface` envelheceu quando os neutros
 * mudaram, e o teste passou a medir contra uma superfície que não existe mais.
 * Lendo, o portão não tem como divergir da folha de estilo.
 */

const CSS = readFileSync(join(process.cwd(), 'app', 'assets', 'css', 'main.css'), 'utf8')

/**
 * O corpo da regra que declara este seletor.
 *
 * Aceita o seletor dentro de uma LISTA (`.previa-do-site, .superficie-do-convite
 * { ... }`), que é como os tokens do convite passaram a ser declarados quando a
 * coluna de marca do login começou a compartilhá-los com a prévia de tema.
 */
function bloco(seletor: string): string {
  const inicio = CSS.search(new RegExp(`^${seletor.replace('.', '\\.')}[,\\s{]`, 'm'))
  expect(inicio, `seletor ${seletor} não encontrado em main.css`).toBeGreaterThan(-1)
  const abre = CSS.indexOf('{', inicio)
  const fecha = CSS.indexOf('\n}', abre)
  return CSS.slice(abre, fecha)
}

function variavel(seletor: string, nome: string): string {
  const match = bloco(seletor).match(new RegExp(`${nome}:\\s*(#[0-9a-f]{6})`, 'i'))
  expect(match?.[1], `${nome} não encontrada em ${seletor}`).toBeDefined()
  return match![1]!
}

const PLATAFORMA = {
  primary: variavel('.marca-da-plataforma', '--color-primary'),
  primaryForeground: variavel('.marca-da-plataforma', '--color-primary-foreground'),
  secondary: variavel('.marca-da-plataforma', '--color-secondary'),
}

/**
 * As superfícies em que a cor realmente pousa — as DUAS linguagens.
 *
 * O painel é cinza (`.admin-ui`), mas a coluna de marca do login é creme
 * (`.superficie-do-convite`), e o disco do "&" vive lá. Medir só contra o cinza
 * deixaria metade das aparições fora do portão.
 */
const SUPERFICIES = {
  'painel: surface': variavel('.admin-ui', '--color-surface'),
  'painel: elevated': variavel('.admin-ui', '--color-surface-elevated'),
  'painel: muted': variavel('.admin-ui', '--color-surface-muted'),
  'convite: surface': variavel('.previa-do-site', '--color-surface'),
  'convite: elevated': variavel('.previa-do-site', '--color-surface-elevated'),
  'convite: muted': variavel('.previa-do-site', '--color-surface-muted'),
}

/** O default do `@theme` — a cor de um casamento que nunca trocou de tema. */
const PRIMARIA_PADRAO = '#6b4a35'

/** Matiz em graus (0-360) — o eixo em que a cor do produto precisa divergir. */
function matiz(hex: string): number {
  const canais = [1, 3, 5].map((inicio) => Number.parseInt(hex.slice(inicio, inicio + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = canais
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0

  const delta = max - min
  const graus =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return (graus * 60 + 360) % 360
}

describe('cor da plataforma', () => {
  it.each(Object.entries(SUPERFICIES))(
    'a primária passa no AA como texto sobre %s',
    (_nome, fundo) => {
      expect(getContrastRatio(PLATAFORMA.primary, fundo)).toBeGreaterThanOrEqual(
        WCAG_AA_MIN_CONTRAST,
      )
    },
  )

  it.each(Object.entries(SUPERFICIES))(
    'a secundária passa no AA como texto sobre %s',
    (_nome, fundo) => {
      expect(getContrastRatio(PLATAFORMA.secondary, fundo)).toBeGreaterThanOrEqual(
        WCAG_AA_MIN_CONTRAST,
      )
    },
  )

  it('a primária passa no AA como preenchimento sólido (UiButton primary)', () => {
    expect(
      getContrastRatio(PLATAFORMA.primaryForeground, PLATAFORMA.primary),
    ).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST)
  })

  /**
   * A cor do produto troca a FAMÍLIA de tom, nunca a presença: se pesasse
   * diferente do default, os mesmos componentes leriam mais fortes (ou mais
   * apagados) fora de um evento do que dentro dele, e a diferença deixaria de
   * dizer "onde estou" para dizer "esta tela está estranha".
   */
  it('tem o mesmo peso visual da primária padrão', () => {
    const superficie = SUPERFICIES['painel: surface']!
    const produto = getContrastRatio(PLATAFORMA.primary, superficie)
    const padrao = getContrastRatio(PRIMARIA_PADRAO, superficie)
    expect(Math.abs(produto - padrao)).toBeLessThan(0.75)
  })

  /**
   * ... e precisa ser distinguível da cor de um casamento, ou o painel interno
   * lê como o painel de um casal. A medida é de MATIZ, não de contraste: duas
   * cores com o mesmo peso têm razão ~1:1 entre si por definição, então medir
   * contraste responderia sempre "iguais" para o par que este teste separa.
   */
  it('fica numa matiz distante da primária padrão', () => {
    const distancia = Math.abs(matiz(PLATAFORMA.primary) - matiz(PRIMARIA_PADRAO))
    expect(Math.min(distancia, 360 - distancia)).toBeGreaterThan(60)
  })
})
