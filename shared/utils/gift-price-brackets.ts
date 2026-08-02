// Faixas de preço da vitrine de presentes (CLAUDE.md, "Fase Vermelho
// Clássico" — filtro por faixa de preço). Calculadas dinamicamente a partir
// do preço real dos presentes de cada casamento (nunca hardcoded — a lista
// varia muito de valor entre casamentos), usando incrementos redondos em
// reais para não gerar faixas com números quebrados.

export interface GiftPriceBracket {
  id: string
  label: string
  min?: number
  max?: number
}

// Em centavos: R$50, R$100, R$200, R$500, R$1.000, R$2.000, R$5.000.
const ROUND_STEPS_CENTS = [5000, 10000, 20000, 50000, 100000, 200000, 500000]
const MAX_BRACKETS = 4

function formatReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function bracketLabel(min: number | undefined, max: number | undefined): string {
  if (min === undefined) return `Até R$${formatReais(max as number)}`
  if (max === undefined) return `Acima de R$${formatReais(min)}`
  return `R$${formatReais(min)} a R$${formatReais(max)}`
}

/**
 * Recebe os preços efetivos (em centavos) dos presentes de um casamento e
 * devolve no máximo `MAX_BRACKETS` faixas cobrindo do menor ao maior valor.
 * Sem presentes com preço definido, devolve lista vazia (vitrine some o
 * filtro em vez de mostrar faixas sem sentido).
 */
export function computeGiftPriceBrackets(pricesCents: number[]): GiftPriceBracket[] {
  const positive = pricesCents.filter((price) => price > 0)
  if (positive.length === 0) return []

  const maxPrice = Math.max(...positive)
  const step =
    ROUND_STEPS_CENTS.find((candidate) => Math.ceil(maxPrice / candidate) <= MAX_BRACKETS) ??
    ROUND_STEPS_CENTS[ROUND_STEPS_CENTS.length - 1]!
  const bracketCount = Math.min(MAX_BRACKETS, Math.ceil(maxPrice / step))

  // Uma única faixa cobrindo tudo não ajuda a filtrar nada (equivale a
  // "Todos") — os preços estão próximos demais pra fazer sentido separar.
  if (bracketCount < 2) return []

  return Array.from({ length: bracketCount }, (_, index) => {
    const min = index === 0 ? undefined : index * step
    const isLast = index === bracketCount - 1
    const max = isLast ? undefined : (index + 1) * step
    return { id: `bracket-${index}`, label: bracketLabel(min, max), min, max }
  })
}
