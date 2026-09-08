import { describe, expect, it } from 'vitest'
import { weddingContentConfigSchema } from '#shared/schemas/content'

const BASE = {
  welcomeTitle: 'Seja muito bem-vindo!',
  welcomeMessage: 'Uma mensagem qualquer.',
  storyMessage: 'Nossa história começou assim.',
  dressCodeDescription: 'Traje social.',
  dressCodeSuggestions: ['Evite branco.'],
  guestManualIntro: 'Informações práticas.',
  guestManualTopics: [
    { icon: 'lucide:bed', title: 'Hospedagem', description: 'Há hotéis por perto.' },
  ],
  giftsIntroMessage: 'Sua presença já é o presente mais importante.',
  faqItems: [{ question: 'Posso levar acompanhante?', answer: 'Depende do convite.' }],
}

describe('weddingContentConfigSchema', () => {
  it('aceita uma configuração completa válida', () => {
    const result = weddingContentConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
  })

  it('aceita dressCodeSuggestions/guestManualTopics/faqItems vazios (casal removeu tudo)', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      dressCodeSuggestions: [],
      guestManualTopics: [],
      faqItems: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejeita campos escalares vazios', () => {
    const result = weddingContentConfigSchema.safeParse({ ...BASE, welcomeTitle: '' })
    expect(result.success).toBe(false)
  })

  it('rejeita campo escalar ausente', () => {
    const { welcomeTitle: _omit, ...rest } = BASE
    const result = weddingContentConfigSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejeita um ícone de tópico desconhecido', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      guestManualTopics: [{ icon: 'lucide:rocket', title: 'X', description: 'Y' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejeita item de FAQ com pergunta vazia', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      faqItems: [{ question: '', answer: 'Resposta.' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejeita mais de 20 itens de FAQ', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      faqItems: Array.from({ length: 21 }, (_, i) => ({ question: `P${i}`, answer: `R${i}` })),
    })
    expect(result.success).toBe(false)
  })

  it('rejeita mais de 12 tópicos do manual', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      guestManualTopics: Array.from({ length: 13 }, () => ({
        icon: 'lucide:info',
        title: 'X',
        description: 'Y',
      })),
    })
    expect(result.success).toBe(false)
  })
})

describe('weddingContentConfigSchema — Versículo', () => {
  it('aceita a ausência total (as duas seções novas são opcionais de ponta a ponta)', () => {
    const result = weddingContentConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.verse).toEqual({})
      expect(result.data.groomsmenManual).toEqual({ palette: [] })
    }
  })

  it('aceita texto e referência', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      verse: { text: 'Este é o dia que fez o Senhor.', reference: 'Salmos 118:24' },
    })
    expect(result.success).toBe(true)
  })

  it('rejeita um versículo acima do limite de tamanho', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      verse: { text: 'a'.repeat(601) },
    })
    expect(result.success).toBe(false)
  })
})

describe('weddingContentConfigSchema — Manual dos Padrinhos', () => {
  it('aceita traje e paleta', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      groomsmenManual: {
        intro: 'Obrigado por caminharem com a gente.',
        attireGroomsmen: 'Terno preto, camisa branca.',
        attireBridesmaids: 'Vestido longo em vermelho escuro.',
        palette: [{ name: 'Vinho', hex: '#8b0000' }],
      },
    })
    expect(result.success).toBe(true)
  })

  it('aceita uma cor de paleta clara demais para ser texto — aqui a cor é o conteúdo', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      groomsmenManual: { palette: [{ name: 'Champanhe', hex: '#f7e7ce' }] },
    })
    expect(result.success).toBe(true)
  })

  it('exige nome em toda cor da paleta — é a informação para quem não distingue o tom', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      groomsmenManual: { palette: [{ name: '', hex: '#8b0000' }] },
    })
    expect(result.success).toBe(false)
  })

  it('rejeita um hex inválido na paleta', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      groomsmenManual: { palette: [{ name: 'Vinho', hex: 'vermelho' }] },
    })
    expect(result.success).toBe(false)
  })

  it('rejeita uma paleta acima de 8 cores', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      groomsmenManual: {
        palette: Array.from({ length: 9 }, (_, i) => ({ name: `Cor ${i}`, hex: '#8b0000' })),
      },
    })
    expect(result.success).toBe(false)
  })
})

describe('weddingContentConfigSchema — marcos da história', () => {
  it('nasce vazio: a seção usa o texto corrido enquanto ninguém preencher', () => {
    const result = weddingContentConfigSchema.safeParse(BASE)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.storyMilestones).toEqual([])
  })

  it('aceita marcos completos', () => {
    const result = weddingContentConfigSchema.safeParse({
      ...BASE,
      storyMilestones: [
        { label: 'O começo', title: 'Conversas que se estenderam', text: 'Papos sem hora.' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('exige os três campos de cada marco — um cartão sem título não desenha', () => {
    for (const incompleto of [
      { label: '', title: 'T', text: 'X' },
      { label: 'L', title: '', text: 'X' },
      { label: 'L', title: 'T', text: '' },
    ]) {
      expect(
        weddingContentConfigSchema.safeParse({ ...BASE, storyMilestones: [incompleto] }).success,
      ).toBe(false)
    }
  })

  it('rejeita mais de 6 marcos', () => {
    const muitos = Array.from({ length: 7 }, (_, i) => ({
      label: `L${i}`,
      title: `T${i}`,
      text: 'X',
    }))
    expect(weddingContentConfigSchema.safeParse({ ...BASE, storyMilestones: muitos }).success).toBe(
      false,
    )
  })
})
