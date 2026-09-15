/**
 * Varredura de contraste da matriz inteira de presets de tema.
 *
 * ## Por que existe
 *
 * `tests/unit/theme-presets.spec.ts` já garante o mínimo AA de cada preset —
 * mas contra UM fundo só: o branco puro de `DEFAULT_SURFACE_COLOR`, que é o
 * pior caso que `checkColorContrast()` foi feito para medir. A plataforma tem
 * QUATRO superfícies reais, e nenhuma delas é branco puro no site público: o
 * marfim do `@theme` (`--color-surface`/`--color-surface-elevated`) e os cinzas
 * neutros do escopo `.admin-ui`. Uma cor pode passar no teste e ainda assim
 * chegar mais apertada numa dessas — este script diz em qual, e de quanto.
 *
 * Não reimplementa o cálculo: usa `getContrastRatio`/`checkColorContrast` de
 * `shared/utils/contrast.ts`, os mesmos que o admin usa para avisar o casal e
 * que o servidor usa antes de gravar `config_tema`.
 *
 * ## O que entra na varredura, e o que fica de fora
 *
 * Entram as três cores de TEXTO de um preset — `primaryColor`,
 * `secondaryColor` e `titleColor` —, porque as três acabam impressas sobre uma
 * dessas superfícies (o CTA, o acento, os nomes do casal no Hero).
 *
 * `ornamentColor` fica de fora de propósito: ele pinta só elemento decorativo
 * (filete, divisor, monograma, o "&" da capa), que o WCAG 1.4.11 exclui do
 * requisito — é a isenção única e deliberada do CLAUDE.md (seção 13). O único
 * lugar em que o ornamento vira texto é o Versículo, sobre a faixa na cor
 * primária, e esse par tem medida própria (`checkOrnamentOnPrimary()`), com
 * outro fundo — medi-lo aqui, contra o marfim, reprovaria uma combinação que
 * na tela é legível.
 *
 * ## Os fundos saem do CSS, nunca de uma cópia aqui
 *
 * Os quatro valores são lidos de `app/assets/css/main.css` em tempo de
 * execução. Uma cópia hardcoded envelheceria em silêncio — o script passaria a
 * medir uma superfície que o site não usa mais e continuaria dando verde. Se um
 * token sumir do CSS, a varredura falha dizendo qual, em vez de adivinhar.
 *
 * ## Uso
 *
 *   npm run audit:contrast
 *
 * Sai com código != 0 na primeira combinação abaixo de 4.5:1 — pronto para
 * virar step de CI.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { THEME_PRESETS, type ThemePreset } from '../shared/theme-presets.ts'
import {
  checkColorContrast,
  getContrastRatio,
  WCAG_AA_MIN_CONTRAST,
} from '../shared/utils/contrast.ts'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CAMINHO_MAIN_CSS = resolve(RAIZ, 'app/assets/css/main.css')

/** Os dois tokens de superfície que qualquer texto da plataforma pode calhar de ter atrás. */
const TOKENS_DE_FUNDO = ['--color-surface', '--color-surface-elevated'] as const
type TokenDeFundo = (typeof TOKENS_DE_FUNDO)[number]

interface ContextoVisual {
  nome: string
  /** O seletor de onde os tokens saem no CSS — `@theme` no público, `.admin-ui` no painel. */
  bloco: string
  fundos: Record<TokenDeFundo, string>
}

interface LinhaDoRelatorio {
  preset: string
  papelDaCor: string
  cor: string
  fundo: string
  tokenDoFundo: TokenDeFundo
  contexto: string
  razao: number
  passa: boolean
}

/**
 * Recorta um bloco `seletor { ... }` do CSS.
 *
 * O seletor é procurado ANCORADO no início da linha e seguido da chave de
 * abertura: `.admin-ui` aparece antes, dentro de um comentário do `@theme`
 * ("aplicado via .admin-ui no fim deste arquivo"), e um `indexOf` cru
 * recortava aquele parágrafo em vez da regra.
 *
 * Contagem de chaves, e não regex preguiçosa até o primeiro `}`: o `@theme` tem
 * comentários com chaves e o `.admin-ui` tem `rgb(... / 0.05)` dentro de
 * sombras. Um `[^}]*` pararia no meio e o token procurado ficaria de fora,
 * fazendo o script reclamar de uma ausência que não existe.
 */
function recortarBloco(css: string, seletor: string): string {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regra = new RegExp(`^${escapado}\\s*\\{`, 'm')
  const achado = css.match(regra)
  if (achado?.index === undefined)
    throw new Error(`Bloco "${seletor}" não encontrado em ${CAMINHO_MAIN_CSS}`)

  const abertura = css.indexOf('{', achado.index)
  if (abertura === -1) throw new Error(`Bloco "${seletor}" sem chave de abertura`)

  let profundidade = 0
  for (let i = abertura; i < css.length; i += 1) {
    if (css[i] === '{') profundidade += 1
    else if (css[i] === '}') {
      profundidade -= 1
      if (profundidade === 0) return css.slice(abertura + 1, i)
    }
  }
  throw new Error(`Bloco "${seletor}" sem chave de fechamento`)
}

function lerToken(bloco: string, token: TokenDeFundo, seletor: string): string {
  // `[^;]` e não `.`: o valor termina no ponto e vírgula, e um comentário na
  // mesma linha não pode entrar junto.
  const achado = bloco.match(new RegExp(`${token}\\s*:\\s*([^;]+);`))
  const valor = achado?.[1]?.trim()
  if (!valor) throw new Error(`Token ${token} não encontrado no bloco "${seletor}"`)
  return valor
}

function lerContextos(): ContextoVisual[] {
  const css = readFileSync(CAMINHO_MAIN_CSS, 'utf8')

  const definicoes: Array<Pick<ContextoVisual, 'nome' | 'bloco'>> = [
    { nome: 'público', bloco: '@theme' },
    { nome: 'admin', bloco: '.admin-ui' },
  ]

  return definicoes.map(({ nome, bloco }) => {
    const conteudo = recortarBloco(css, bloco)
    return {
      nome,
      bloco,
      fundos: {
        '--color-surface': lerToken(conteudo, '--color-surface', bloco),
        '--color-surface-elevated': lerToken(conteudo, '--color-surface-elevated', bloco),
      },
    }
  })
}

/** As cores de texto de um preset, na ordem em que aparecem na tela. */
function coresDeTexto(preset: ThemePreset): Array<{ papel: string; hex: string }> {
  const cores = [
    { papel: 'primaryColor', hex: preset.primaryColor },
    { papel: 'secondaryColor', hex: preset.secondaryColor },
  ]
  // `titleColor` é opcional — preset sem ela herda `--color-text`, que é token
  // fixo da plataforma e não faz parte da matriz de presets.
  if (preset.titleColor) cores.push({ papel: 'titleColor', hex: preset.titleColor })
  return cores
}

function montarRelatorio(contextos: ContextoVisual[]): LinhaDoRelatorio[] {
  const linhas: LinhaDoRelatorio[] = []

  for (const preset of THEME_PRESETS) {
    for (const { papel, hex } of coresDeTexto(preset)) {
      for (const contexto of contextos) {
        for (const token of TOKENS_DE_FUNDO) {
          const fundo = contexto.fundos[token]
          const razao = getContrastRatio(hex, fundo)
          linhas.push({
            preset: preset.label,
            papelDaCor: papel,
            cor: hex,
            fundo,
            tokenDoFundo: token,
            contexto: contexto.nome,
            razao,
            passa: razao >= WCAG_AA_MIN_CONTRAST,
          })
        }
      }
    }
  }

  return linhas
}

function formatarRazao(razao: number): string {
  return `${razao.toFixed(2)}:1`
}

function imprimirTabela(linhas: LinhaDoRelatorio[]): void {
  const cabecalho = ['preset', 'cor', 'fundo', 'contexto', 'razão', 'passa AA'] as const

  const corpo = linhas.map((linha) => [
    linha.preset,
    `${linha.cor} (${linha.papelDaCor})`,
    `${linha.fundo} (${linha.tokenDoFundo.replace('--color-', '')})`,
    linha.contexto,
    formatarRazao(linha.razao),
    linha.passa ? 'sim' : 'NÃO',
  ])

  const larguras = cabecalho.map((titulo, coluna) =>
    Math.max(titulo.length, ...corpo.map((celulas) => (celulas[coluna] ?? '').length)),
  )

  const linhaFormatada = (celulas: readonly string[]) =>
    celulas.map((celula, coluna) => celula.padEnd(larguras[coluna] ?? 0)).join('  ')

  console.log(linhaFormatada(cabecalho))
  console.log(larguras.map((largura) => '─'.repeat(largura)).join('  '))
  for (const celulas of corpo) console.log(linhaFormatada(celulas))
}

function main(): void {
  const contextos = lerContextos()

  console.log(`Contraste dos presets de tema — mínimo AA de ${WCAG_AA_MIN_CONTRAST}:1\n`)
  for (const contexto of contextos) {
    const fundos = TOKENS_DE_FUNDO.map(
      (token) => `${token.replace('--color-', '')}=${contexto.fundos[token]}`,
    ).join(', ')
    console.log(`  contexto "${contexto.nome}" (${contexto.bloco}): ${fundos}`)
  }
  console.log('')

  const linhas = montarRelatorio(contextos)
  imprimirTabela(linhas)

  const reprovadas = linhas.filter((linha) => !linha.passa)
  console.log('')
  console.log(`${linhas.length} combinações verificadas · ${reprovadas.length} abaixo do mínimo`)

  // O contraponto que explica o resultado: `checkColorContrast()` mede contra
  // branco puro, o pior caso. Uma cor que passa lá e reprova aqui significa
  // que a superfície real é mais escura que o pior caso previsto — o que não
  // acontece com marfim nem com o cinza claro, mas o script diz em vez de
  // supor.
  const divergentes = linhas.filter(
    (linha) => !linha.passa && checkColorContrast(linha.cor).meetsMinimum,
  )

  if (reprovadas.length === 0) {
    console.log('Todas as combinações passam no mínimo AA.')
    return
  }

  console.log('\nReprovadas:')
  for (const linha of reprovadas) {
    console.log(
      `  ${linha.preset} · ${linha.papelDaCor} ${linha.cor} sobre ${linha.fundo} ` +
        `(${linha.contexto}/${linha.tokenDoFundo.replace('--color-', '')}) = ${formatarRazao(linha.razao)}`,
    )
  }

  if (divergentes.length > 0) {
    console.log(
      `\n${divergentes.length} delas passam em checkColorContrast() (branco puro) e reprovam ` +
        `na superfície real — o validador do admin deixaria a cor ser salva.`,
    )
  }

  process.exitCode = 1
}

main()
