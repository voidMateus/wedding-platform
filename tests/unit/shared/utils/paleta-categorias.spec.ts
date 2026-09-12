import { describe, expect, it } from 'vitest'
import { getContrastRatio, WCAG_AA_MIN_CONTRAST } from '#shared/utils/contrast'
import {
  corDaCategoria,
  corDaCategoriaComOverride,
  paletaDeCategorias,
  TAMANHO_PALETA_CATEGORIAS,
} from '#shared/utils/paleta-categorias'

/**
 * A paleta categórica é derivada, nunca gravada: o banco guarda só a POSIÇÃO
 * (`cor_indice`). O que estes testes protegem é o que essa escolha promete —
 * que trocar o tema repinta tudo, que dois slots nunca dão o mesmo tom, e que
 * o texto sobre o fundo tingido continua legível seja qual for a cor do casal.
 */

const BORGONHA = '#6b2737'
const TURQUESA = '#1d7a7a'

/** Matiz em graus — é por ela que se reconhece "a mesma cor, mais calma". */
function matiz(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255
  const maior = Math.max(r, g, b)
  const delta = maior - Math.min(r, g, b)
  if (delta === 0) return 0
  if (maior === r) return (((g - b) / delta + (g < b ? 6 : 0)) * 60) % 360
  if (maior === g) return ((b - r) / delta + 2) * 60
  return ((r - g) / delta + 4) * 60
}

describe('corDaCategoria', () => {
  it('a paleta responde ao tema: mesma posição, cor diferente por casamento', () => {
    const comBorgonha = corDaCategoria(0, BORGONHA)
    const comTurquesa = corDaCategoria(0, TURQUESA)

    expect(comBorgonha.solida).not.toBe(comTurquesa.solida)
  })

  it('o slot 0 parte da própria cor do casamento', () => {
    // A matiz, não o hex: a paleta prende saturação e luminosidade numa faixa
    // estreita de propósito, então o slot 0 é a cor do casal "acalmada" — o
    // que precisa ser idêntico é o tom, que é o que o olho reconhece.
    for (const tema of [BORGONHA, TURQUESA, '#2f4858']) {
      expect(matiz(corDaCategoria(0, tema).solida)).toBeCloseTo(matiz(tema), 0)
    }
  })

  it('os 12 slots dão 12 tons distintos', () => {
    const tons = paletaDeCategorias(BORGONHA).map((cor) => cor.solida)
    expect(new Set(tons).size).toBe(TAMANHO_PALETA_CATEGORIAS)
  })

  it('slots vizinhos ficam longe na roda de cores', () => {
    // Buffet e Bebidas nascem em sequência: se o passo fosse de 30°, sairiam
    // com praticamente o mesmo tom e a paleta não organizaria nada.
    const primeiro = corDaCategoria(0, BORGONHA).solida
    const segundo = corDaCategoria(1, BORGONHA).solida
    expect(primeiro).not.toBe(segundo)

    const distancia = (hex: string) => Number.parseInt(hex.slice(1), 16)
    expect(Math.abs(distancia(primeiro) - distancia(segundo))).toBeGreaterThan(0x100000)
  })

  it('o texto passa em AA sobre o fundo tingido, em toda a paleta e em qualquer tema', () => {
    // A cor é decoração até o momento em que vira texto — aí ela precisa ser
    // legível, e o casal pode ter escolhido qualquer cor tema.
    for (const tema of [BORGONHA, TURQUESA, '#2f4858', '#c9a227', '#333333']) {
      for (const cor of paletaDeCategorias(tema)) {
        expect(getContrastRatio(cor.texto, cor.fundo)).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST)
      }
    }
  })

  it('o fundo é quase imperceptível — nunca um bloco colorido', () => {
    for (const cor of paletaDeCategorias(BORGONHA)) {
      // Contra branco, um fundo com mais de 1.2:1 já lê como cor chapada.
      expect(getContrastRatio(cor.fundo, '#ffffff')).toBeLessThan(1.2)
    }
  })

  it('tema cinza não devolve doze cinzas', () => {
    // Girar a matiz de um cinza devolve sempre cinza: sem saturação não há
    // matiz para girar.
    const tons = paletaDeCategorias('#8a8a8a').map((cor) => cor.solida)
    expect(new Set(tons).size).toBe(TAMANHO_PALETA_CATEGORIAS)
  })

  it('índice fora da paleta dá a volta, e entrada inválida cai no slot 0', () => {
    expect(corDaCategoria(TAMANHO_PALETA_CATEGORIAS, BORGONHA)).toEqual(corDaCategoria(0, BORGONHA))
    expect(corDaCategoria(-1, BORGONHA)).toEqual(
      corDaCategoria(TAMANHO_PALETA_CATEGORIAS - 1, BORGONHA),
    )
    expect(corDaCategoria(Number.NaN, BORGONHA)).toEqual(corDaCategoria(0, BORGONHA))
  })

  it('cor tema inválida não quebra a paleta', () => {
    expect(() => paletaDeCategorias('não é cor')).not.toThrow()
    expect(paletaDeCategorias('não é cor')[0]?.solida).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('corDaCategoriaComOverride', () => {
  it('a personalizada manda, e o fundo continua derivado dela', () => {
    const cor = corDaCategoriaComOverride(3, BORGONHA, '#2f6f4e')

    expect(cor.solida).toBe('#2f6f4e')
    expect(cor.fundo).not.toBe(corDaCategoria(3, BORGONHA).fundo)
    expect(getContrastRatio(cor.texto, cor.fundo)).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST)
  })

  it('sem personalizada (o normal), usa o slot', () => {
    expect(corDaCategoriaComOverride(3, BORGONHA, null)).toEqual(corDaCategoria(3, BORGONHA))
    expect(corDaCategoriaComOverride(3, BORGONHA, undefined)).toEqual(corDaCategoria(3, BORGONHA))
  })

  it('personalizada inválida é ignorada em vez de virar cor quebrada', () => {
    expect(corDaCategoriaComOverride(3, BORGONHA, 'roxo')).toEqual(corDaCategoria(3, BORGONHA))
  })
})
