import { describe, expect, it } from 'vitest'
import { giftInputSchema } from '#shared/schemas/gifts'

describe('giftInputSchema', () => {
  it('aceita um presente simples válido', () => {
    const result = giftInputSchema.safeParse({
      titulo: 'Jogo de panelas',
      ePresenteCota: false,
      quantidadeDisponivel: 2,
    })
    expect(result.success).toBe(true)
  })

  it('aceita um presente de cota válido', () => {
    const result = giftInputSchema.safeParse({
      titulo: 'Lua de mel',
      ePresenteCota: true,
      valorMetaCentavos: 500000,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita presente simples sem quantidade disponível', () => {
    const result = giftInputSchema.safeParse({ titulo: 'Jogo de panelas', ePresenteCota: false })
    expect(result.success).toBe(false)
  })

  it('rejeita presente de cota sem valor-alvo', () => {
    const result = giftInputSchema.safeParse({ titulo: 'Lua de mel', ePresenteCota: true })
    expect(result.success).toBe(false)
  })

  it('rejeita presente de cota com valor-alvo zero', () => {
    const result = giftInputSchema.safeParse({
      titulo: 'Lua de mel',
      ePresenteCota: true,
      valorMetaCentavos: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita título vazio', () => {
    const result = giftInputSchema.safeParse({
      titulo: '  ',
      ePresenteCota: false,
      quantidadeDisponivel: 1,
    })
    expect(result.success).toBe(false)
  })

  it('aceita quantidadeDisponivel igual a zero (esgotado)', () => {
    const result = giftInputSchema.safeParse({
      titulo: 'Jogo de panelas',
      ePresenteCota: false,
      quantidadeDisponivel: 0,
    })
    expect(result.success).toBe(true)
  })

  it('aceita cota fixa (valorCotaCentavos) num presente de cota', () => {
    const result = giftInputSchema.safeParse({
      titulo: 'Air Fryer',
      ePresenteCota: true,
      valorMetaCentavos: 80000,
      valorCotaCentavos: 10000,
    })
    expect(result.success).toBe(true)
  })

  it('aceita estilo emocional com ícone do catálogo', () => {
    const result = giftInputSchema.safeParse({
      titulo: 'Nos ajude na primeira compra',
      ePresenteCota: true,
      valorMetaCentavos: 30000,
      estiloExibicao: 'emocional',
      iconeEmocional: 'home',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita ícone fora do catálogo fixo', () => {
    const result = giftInputSchema.safeParse({
      titulo: 'Nos ajude na primeira compra',
      ePresenteCota: true,
      valorMetaCentavos: 30000,
      estiloExibicao: 'emocional',
      iconeEmocional: 'foguete-nao-existe',
    })
    expect(result.success).toBe(false)
  })

  it('estiloExibicao tem "padrao" como default', () => {
    const result = giftInputSchema.safeParse({
      titulo: 'Jogo de panelas',
      ePresenteCota: false,
      quantidadeDisponivel: 1,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.estiloExibicao).toBe('padrao')
    }
  })
})
