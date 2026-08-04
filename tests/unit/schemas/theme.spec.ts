import { describe, expect, it } from 'vitest'
import { themeConfigSchema } from '#shared/schemas/theme'

const BASE = {
  primaryColor: '#5c1a2b',
  secondaryColor: '#8a6a1f',
  fontPairId: 'dmserif-dmsans',
  showCountdown: true,
}

describe('themeConfigSchema', () => {
  it('aceita configuração válida sem cor avançada', () => {
    const result = themeConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.titleColor).toBeUndefined()
      expect(result.data.bodyColor).toBeUndefined()
    }
  })

  it('aceita titleColor/bodyColor válidos (modo avançado)', () => {
    const result = themeConfigSchema.safeParse({
      ...BASE,
      titleColor: '#2b2622',
      bodyColor: '#3a332c',
    })
    expect(result.success).toBe(true)
  })

  it('trata titleColor/bodyColor como string vazia = não definido', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, titleColor: '', bodyColor: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.titleColor).toBeUndefined()
      expect(result.data.bodyColor).toBeUndefined()
    }
  })

  it('rejeita titleColor em formato inválido', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, titleColor: 'não é hex' })
    expect(result.success).toBe(false)
  })

  it('rejeita bodyColor com contraste insuficiente', () => {
    // Dourado claro, abaixo do mínimo de 4.5:1 contra o fundo padrão.
    const result = themeConfigSchema.safeParse({ ...BASE, bodyColor: '#e8d9b0' })
    expect(result.success).toBe(false)
  })

  it('rejeita primaryColor/secondaryColor ausentes', () => {
    const result = themeConfigSchema.safeParse({
      fontPairId: 'dmserif-dmsans',
      showCountdown: true,
    })
    expect(result.success).toBe(false)
  })

  it('usa o default de heroButtons quando ausente', () => {
    const result = themeConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.heroButtons).toEqual(['presentes', 'confirmar-presenca', 'cronograma', 'manual-convidados'])
    }
  })

  it('aceita uma seleção customizada de heroButtons/heroFeaturedButton', () => {
    const result = themeConfigSchema.safeParse({
      ...BASE,
      heroButtons: ['galeria', 'faq'],
      heroFeaturedButton: 'faq',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.heroButtons).toEqual(['galeria', 'faq'])
      expect(result.data.heroFeaturedButton).toBe('faq')
    }
  })

  it('rejeita um id de heroButtons desconhecido', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, heroButtons: ['não-existe'] })
    expect(result.success).toBe(false)
  })

  it('trata heroFeaturedButton como string vazia = não definido', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, heroFeaturedButton: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.heroFeaturedButton).toBeUndefined()
    }
  })

  it('usa o default "cards" de countdownStyle quando ausente', () => {
    const result = themeConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.countdownStyle).toBe('cards')
    }
  })

  it('aceita countdownStyle "inline"', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, countdownStyle: 'inline' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.countdownStyle).toBe('inline')
    }
  })

  it('rejeita um countdownStyle desconhecido', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, countdownStyle: 'balões' })
    expect(result.success).toBe(false)
  })

  it('aceita heroQuote/heroQuoteAttribution quando definidos', () => {
    const result = themeConfigSchema.safeParse({
      ...BASE,
      heroQuote: 'Assim, eles já não são dois, mas sim uma só carne.',
      heroQuoteAttribution: 'Mateus 19:6',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.heroQuote).toBe('Assim, eles já não são dois, mas sim uma só carne.')
      expect(result.data.heroQuoteAttribution).toBe('Mateus 19:6')
    }
  })

  it('trata heroQuote/heroQuoteAttribution como string vazia = não definido', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, heroQuote: '', heroQuoteAttribution: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.heroQuote).toBeUndefined()
      expect(result.data.heroQuoteAttribution).toBeUndefined()
    }
  })

  it('rejeita heroQuote acima de 280 caracteres', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, heroQuote: 'a'.repeat(281) })
    expect(result.success).toBe(false)
  })

  it('é válido sem heroQuote/heroQuoteAttribution (ambos opcionais)', () => {
    const result = themeConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.heroQuote).toBeUndefined()
      expect(result.data.heroQuoteAttribution).toBeUndefined()
    }
  })
})
