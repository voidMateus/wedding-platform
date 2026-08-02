import { describe, expect, it } from 'vitest'
import { computeGiftPriceBrackets } from '#shared/utils/gift-price-brackets'

describe('computeGiftPriceBrackets', () => {
  it('retorna lista vazia sem preços', () => {
    expect(computeGiftPriceBrackets([])).toEqual([])
  })

  it('ignora preços zero/negativos', () => {
    expect(computeGiftPriceBrackets([0, -100])).toEqual([])
  })

  it('não gera faixas quando todos os preços cabem no mesmo step (nada pra filtrar)', () => {
    const brackets = computeGiftPriceBrackets([3000, 4500])
    expect(brackets).toEqual([])
  })

  it('gera múltiplas faixas cobrindo do menor ao maior preço', () => {
    const brackets = computeGiftPriceBrackets([2000, 15000])
    expect(brackets.length).toBeGreaterThan(1)
    expect(brackets[0]!.min).toBeUndefined()
    expect(brackets[brackets.length - 1]!.max).toBeUndefined()
  })

  it('nunca gera mais de 4 faixas, mesmo com preços muito altos', () => {
    const brackets = computeGiftPriceBrackets([1000000])
    expect(brackets.length).toBeLessThanOrEqual(4)
    expect(brackets[brackets.length - 1]!.max).toBeUndefined()
  })

  it('a última faixa é sempre "Acima de R$X" (sem teto)', () => {
    const brackets = computeGiftPriceBrackets([2000, 8000, 15000, 45000])
    expect(brackets[brackets.length - 1]!.label).toMatch(/^Acima de R\$/)
  })
})
