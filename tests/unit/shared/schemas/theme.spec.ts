import { describe, expect, it } from 'vitest'
import { themeConfigSchema } from '#shared/schemas/theme'
import { DEFAULT_SECTION_ORDER } from '#shared/home-sections'

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
      expect(result.data.heroButtons).toEqual([
        'presentes',
        'confirmar-presenca',
        'cronograma',
        'manual-convidados',
      ])
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
})

describe('themeConfigSchema — cor de ornamento', () => {
  it('aceita um dourado claro que reprovaria como cor de texto', () => {
    // O ponto inteiro do campo: #c8a56a fica em ~2.3:1 contra o fundo claro e
    // é rejeitado em titleColor/bodyColor (ver caso acima) — como ornamento,
    // passa, porque ali ele desenha filete, não letra.
    const result = themeConfigSchema.safeParse({ ...BASE, ornamentColor: '#c8a56a' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ornamentColor).toBe('#c8a56a')
    }
  })

  it('a mesma cor continua reprovada como cor de corpo de texto', () => {
    // Guarda contra o campo virar porta dos fundos: a isenção vale só para
    // ornamentColor, nunca vaza para as demais cores.
    expect(themeConfigSchema.safeParse({ ...BASE, bodyColor: '#c8a56a' }).success).toBe(false)
  })

  it('trata string vazia como não definido', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, ornamentColor: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ornamentColor).toBeUndefined()
    }
  })

  it('rejeita formato inválido', () => {
    expect(themeConfigSchema.safeParse({ ...BASE, ornamentColor: 'dourado' }).success).toBe(false)
  })
})

describe('themeConfigSchema — estilo de título e moldura', () => {
  it('usa os defaults quando ausentes', () => {
    const result = themeConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.headingStyle).toBe('classic')
      expect(result.data.ornamentFrame).toBe(false)
    }
  })

  it('aceita headingStyle "engraved"', () => {
    const result = themeConfigSchema.safeParse({ ...BASE, headingStyle: 'engraved' })
    expect(result.success).toBe(true)
  })

  it('rejeita um headingStyle fora da união', () => {
    expect(themeConfigSchema.safeParse({ ...BASE, headingStyle: 'caixa-alta' }).success).toBe(false)
  })
})

describe('themeConfigSchema — ordem das seções', () => {
  it('usa a ordem padrão quando ausente', () => {
    const result = themeConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sectionOrder).toEqual(DEFAULT_SECTION_ORDER)
    }
  })

  it('aceita uma ordem customizada', () => {
    const result = themeConfigSchema.safeParse({
      ...BASE,
      sectionOrder: ['versiculo', 'boas-vindas'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sectionOrder).toEqual(['versiculo', 'boas-vindas'])
    }
  })

  it('rejeita um id de seção desconhecido', () => {
    expect(
      themeConfigSchema.safeParse({ ...BASE, sectionOrder: ['boas-vindas', 'inexistente'] })
        .success,
    ).toBe(false)
  })

  it('rejeita uma lista maior que o catálogo', () => {
    const tooLong = [...DEFAULT_SECTION_ORDER, ...DEFAULT_SECTION_ORDER]
    expect(themeConfigSchema.safeParse({ ...BASE, sectionOrder: tooLong }).success).toBe(false)
  })
})
