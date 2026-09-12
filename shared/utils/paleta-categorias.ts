import { DEFAULT_PRIMARY_COLOR, isValidHexColor } from './contrast'

/**
 * A paleta categórica do Financeiro — derivada da cor tema do casamento.
 *
 * A regra: cada casamento tem uma cor; a partir dela o sistema gera uma família
 * de tons harmonizados, e cada categoria ocupa uma POSIÇÃO estável nessa
 * família (`categorias_orcamento.cor_indice`). Trocar o tema repinta todas as
 * categorias sem tocar em nenhuma linha do banco, e excluir uma categoria não
 * repinta as outras.
 *
 * Por que rotação de matiz e não uma lista de cores com nome: "borgonha →
 * terracota, ameixa, rosé" só funciona para borgonha. Girando a matiz a partir
 * da cor escolhida, com saturação e luminosidade presas numa faixa estreita e
 * dessaturada, o resultado pertence à mesma identidade seja qual for a cor do
 * casal — e é a faixa estreita, não a matiz, que impede o carnaval.
 *
 * A cor nunca domina a interface: ela pinta filete lateral, ícone e um fundo
 * quase imperceptível. Quem manda no visual continua sendo a cor tema, nos
 * elementos de marca e nas ações.
 */

export const TAMANHO_PALETA_CATEGORIAS = 12

/**
 * A ordem em que a paleta caminha pela roda de cores.
 *
 * Não é 0°, 30°, 60°…: slots vizinhos são criados em sequência (o casal cadastra
 * Buffet e depois Bebidas), e dois tons a 30° de distância são quase o mesmo
 * tom. Saltando meia roda a cada passo, as categorias criadas em seguida saem
 * bem diferentes uma da outra, e a volta completa ainda cobre as 12 posições
 * sem repetir nenhuma.
 */
const PASSOS_DE_MATIZ = [0, 6, 3, 9, 1, 7, 4, 10, 2, 8, 5, 11] as const

/** A faixa que mantém tudo na mesma família — dessaturado e claro. */
const SATURACAO_SOLIDA = 0.36
const LUMINOSIDADE_SOLIDA = 0.42
const SATURACAO_FUNDO = 0.4
const LUMINOSIDADE_FUNDO = 0.965
const SATURACAO_TEXTO = 0.46
const LUMINOSIDADE_TEXTO = 0.26

/** Abaixo disso a cor tema é cinza, e girar a matiz dela devolveria 12 cinzas. */
const SATURACAO_MINIMA_DO_TEMA = 0.08

export interface CorDeCategoria {
  /** Filete lateral e ícone — o traço que identifica a categoria. */
  solida: string
  /** Fundo tingido, quase imperceptível. */
  fundo: string
  /** Texto sobre o fundo tingido. */
  texto: string
}

interface Hsl {
  h: number
  s: number
  l: number
}

function hexParaHsl(hex: string): Hsl {
  const normalizado =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex

  const r = Number.parseInt(normalizado.slice(1, 3), 16) / 255
  const g = Number.parseInt(normalizado.slice(3, 5), 16) / 255
  const b = Number.parseInt(normalizado.slice(5, 7), 16) / 255

  const maior = Math.max(r, g, b)
  const menor = Math.min(r, g, b)
  const l = (maior + menor) / 2

  if (maior === menor) return { h: 0, s: 0, l }

  const delta = maior - menor
  const s = l > 0.5 ? delta / (2 - maior - menor) : delta / (maior + menor)

  let h: number
  if (maior === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60
  else if (maior === g) h = ((b - r) / delta + 2) * 60
  else h = ((r - g) / delta + 4) * 60

  return { h, s, l }
}

function canalParaHex(valor: number): string {
  return Math.round(Math.min(1, Math.max(0, valor)) * 255)
    .toString(16)
    .padStart(2, '0')
}

function hslParaHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hLinha = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hLinha % 2) - 1))
  const m = l - c / 2

  const [r, g, b] =
    hLinha < 1
      ? [c, x, 0]
      : hLinha < 2
        ? [x, c, 0]
        : hLinha < 3
          ? [0, c, x]
          : hLinha < 4
            ? [0, x, c]
            : hLinha < 5
              ? [x, 0, c]
              : [c, 0, x]

  return `#${canalParaHex((r ?? 0) + m)}${canalParaHex((g ?? 0) + m)}${canalParaHex((b ?? 0) + m)}`
}

/** A matiz de onde a paleta parte. Cor inválida ou cinza cai na cor padrão. */
function matizDeReferencia(corTema: string): number {
  const base = isValidHexColor(corTema) ? corTema : DEFAULT_PRIMARY_COLOR
  const { h, s } = hexParaHsl(base)
  if (s < SATURACAO_MINIMA_DO_TEMA) return hexParaHsl(DEFAULT_PRIMARY_COLOR).h
  return h
}

/**
 * A cor de um slot da paleta.
 *
 * `indice` fora da paleta dá a volta (13ª categoria repete o tom da 1ª) — e a
 * volta é aceitável: quem tem 13 categorias financeiras já não distingue 13
 * cores. Índice negativo ou quebrado cai no slot 0, nunca em `NaN`.
 */
export function corDaCategoria(indice: number, corTema: string): CorDeCategoria {
  const posicao = Number.isFinite(indice)
    ? ((Math.trunc(indice) % TAMANHO_PALETA_CATEGORIAS) + TAMANHO_PALETA_CATEGORIAS) %
      TAMANHO_PALETA_CATEGORIAS
    : 0

  const passo = PASSOS_DE_MATIZ[posicao] ?? 0
  const h = matizDeReferencia(corTema) + passo * (360 / TAMANHO_PALETA_CATEGORIAS)

  return {
    solida: hslParaHex({ h, s: SATURACAO_SOLIDA, l: LUMINOSIDADE_SOLIDA }),
    fundo: hslParaHex({ h, s: SATURACAO_FUNDO, l: LUMINOSIDADE_FUNDO }),
    texto: hslParaHex({ h, s: SATURACAO_TEXTO, l: LUMINOSIDADE_TEXTO }),
  }
}

/**
 * A cor que a categoria usa de fato: a personalizada quando o casal fixou uma,
 * a derivada do slot no resto dos casos (que é o normal).
 *
 * Personalizada entra como `solida`; o fundo e o texto continuam derivados
 * dela, para o par sobre fundo tingido manter o mesmo contraste do automático.
 */
export function corDaCategoriaComOverride(
  indice: number,
  corTema: string,
  personalizada: string | null | undefined,
): CorDeCategoria {
  if (!personalizada || !isValidHexColor(personalizada)) {
    return corDaCategoria(indice, corTema)
  }

  const { h } = hexParaHsl(personalizada)
  return {
    solida: personalizada,
    fundo: hslParaHex({ h, s: SATURACAO_FUNDO, l: LUMINOSIDADE_FUNDO }),
    texto: hslParaHex({ h, s: SATURACAO_TEXTO, l: LUMINOSIDADE_TEXTO }),
  }
}

/** A paleta inteira — para a grade de escolha manual da cor. */
export function paletaDeCategorias(corTema: string): CorDeCategoria[] {
  return Array.from({ length: TAMANHO_PALETA_CATEGORIAS }, (_, indice) =>
    corDaCategoria(indice, corTema),
  )
}
