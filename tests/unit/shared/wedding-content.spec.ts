import { describe, expect, it } from 'vitest'
import {
  DRESS_CODE_CONTENT,
  FAQ_CONTENT,
  GIFTS_INTRO_CONTENT,
  GUEST_MANUAL_CONTENT,
  STORY_CONTENT,
  WELCOME_CONTENT,
  hasGroomsmenManualContent,
  hasVerseContent,
  resolveWeddingContent,
} from '#shared/wedding-content'

describe('resolveWeddingContent', () => {
  it('sem config_conteudo (null), usa 100% do texto padrão da plataforma', () => {
    const resolved = resolveWeddingContent(null)
    expect(resolved.welcomeTitle).toBe(WELCOME_CONTENT.title)
    expect(resolved.welcomeParagraphs).toEqual(WELCOME_CONTENT.paragraphs)
    expect(resolved.storyParagraphs).toEqual(STORY_CONTENT.paragraphs)
    expect(resolved.dressCodeDescription).toBe(DRESS_CODE_CONTENT.description)
    expect(resolved.dressCodeSuggestions).toEqual(DRESS_CODE_CONTENT.suggestions)
    expect(resolved.guestManualIntro).toBe(GUEST_MANUAL_CONTENT.intro)
    expect(resolved.guestManualTopics).toEqual(GUEST_MANUAL_CONTENT.topics)
    expect(resolved.giftsIntroMessage).toBe(GIFTS_INTRO_CONTENT.message)
    expect(resolved.faqItems).toEqual(FAQ_CONTENT)
  })

  it('sobrescreve só os campos escalares presentes, mantendo os demais no padrão', () => {
    const resolved = resolveWeddingContent({ welcomeTitle: 'Bem-vindos à nossa festa!' })
    expect(resolved.welcomeTitle).toBe('Bem-vindos à nossa festa!')
    expect(resolved.storyParagraphs).toEqual(STORY_CONTENT.paragraphs)
  })

  it('separa welcomeMessage/storyMessage customizados em parágrafos por linha em branco', () => {
    const resolved = resolveWeddingContent({
      welcomeMessage: 'Primeiro.\n\nSegundo.',
      storyMessage: 'Único parágrafo.',
    })
    expect(resolved.welcomeParagraphs).toEqual(['Primeiro.', 'Segundo.'])
    expect(resolved.storyParagraphs).toEqual(['Único parágrafo.'])
  })

  it('array explicitamente vazio (customizado) não cai no default — casal removeu os itens', () => {
    const resolved = resolveWeddingContent({ faqItems: [], guestManualTopics: [] })
    expect(resolved.faqItems).toEqual([])
    expect(resolved.guestManualTopics).toEqual([])
  })

  it('array preenchido substitui o default por completo (não faz merge)', () => {
    const customTopics = [
      { icon: 'lucide:info', title: 'Custom', description: 'Descrição custom.' },
    ]
    const resolved = resolveWeddingContent({ guestManualTopics: customTopics })
    expect(resolved.guestManualTopics).toEqual(customTopics)
  })
})

describe('resolveWeddingContent — seções opcionais', () => {
  it('sem config, Versículo e Manual dos Padrinhos ficam vazios (sem texto padrão da plataforma)', () => {
    const resolved = resolveWeddingContent(null)
    expect(resolved.verse).toEqual({ text: '', reference: '' })
    expect(resolved.groomsmenManual).toEqual({
      intro: '',
      attireGroomsmen: '',
      attireBridesmaids: '',
      palette: [],
    })
  })

  it('resolve o versículo e o manual dos padrinhos quando o casal preencheu', () => {
    const resolved = resolveWeddingContent({
      verse: { text: 'Este é o dia que fez o Senhor.', reference: 'Salmos 118:24' },
      groomsmenManual: {
        attireGroomsmen: 'Terno preto.',
        palette: [{ name: 'Vinho', hex: '#8b0000' }],
      },
    })
    expect(resolved.verse.text).toBe('Este é o dia que fez o Senhor.')
    expect(resolved.groomsmenManual.attireGroomsmen).toBe('Terno preto.')
    expect(resolved.groomsmenManual.attireBridesmaids).toBe('')
    expect(resolved.groomsmenManual.palette).toEqual([{ name: 'Vinho', hex: '#8b0000' }])
  })
})

describe('hasVerseContent / hasGroomsmenManualContent', () => {
  it('versículo só existe com texto — a referência sozinha não sustenta a seção', () => {
    expect(hasVerseContent(resolveWeddingContent(null).verse)).toBe(false)
    expect(
      hasVerseContent(resolveWeddingContent({ verse: { reference: 'Salmos 118' } }).verse),
    ).toBe(false)
    expect(hasVerseContent(resolveWeddingContent({ verse: { text: 'Algo' } }).verse)).toBe(true)
  })

  it('texto só de espaços não conta como conteúdo', () => {
    expect(hasVerseContent(resolveWeddingContent({ verse: { text: '   ' } }).verse)).toBe(false)
  })

  it('manual dos padrinhos existe com qualquer um dos campos preenchidos', () => {
    expect(hasGroomsmenManualContent(resolveWeddingContent(null).groomsmenManual)).toBe(false)

    for (const config of [
      { groomsmenManual: { intro: 'Oi' } },
      { groomsmenManual: { attireGroomsmen: 'Terno' } },
      { groomsmenManual: { attireBridesmaids: 'Vestido' } },
      { groomsmenManual: { palette: [{ name: 'Vinho', hex: '#8b0000' }] } },
    ]) {
      expect(hasGroomsmenManualContent(resolveWeddingContent(config).groomsmenManual)).toBe(true)
    }
  })
})
