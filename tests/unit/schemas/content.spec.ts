import { describe, expect, it } from 'vitest'
import { weddingContentConfigSchema } from '#shared/schemas/content'

const BASE = {
  welcomeTitle: 'Seja muito bem-vindo!',
  welcomeMessage: 'Uma mensagem qualquer.',
  storyMessage: 'Nossa história começou assim.',
  dressCodeDescription: 'Traje social.',
  dressCodeSuggestions: ['Evite branco.'],
  guestManualIntro: 'Informações práticas.',
  guestManualTopics: [{ icon: 'lucide:bed', title: 'Hospedagem', description: 'Há hotéis por perto.' }],
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
