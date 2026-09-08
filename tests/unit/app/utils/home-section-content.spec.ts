import { describe, expect, it } from 'vitest'
import { resolveHomeSectionContent } from '~/utils/home-section-content'

const SEM_CONTEUDO_OPCIONAL = { eventSegmentCount: 0, photoCount: 0 }

describe('resolveHomeSectionContent', () => {
  it('sem nada configurado, só as seções com texto padrão da plataforma sobrevivem', () => {
    // Versículo e Manual dos Padrinhos nascem vazios de propósito; Manual dos
    // Convidados e FAQ já vêm com texto padrão; cronograma e galeria dependem
    // de dados que este casamento ainda não tem.
    const flags = resolveHomeSectionContent({ contentConfig: null, ...SEM_CONTEUDO_OPCIONAL })
    expect(flags.versiculo).toBe(false)
    expect(flags['manual-padrinhos']).toBe(false)
    expect(flags['grande-dia']).toBe(false)
    expect(flags['nossos-momentos']).toBe(false)
    expect(flags['manual-convidados']).toBe(true)
    expect(flags.faq).toBe(true)
  })

  it('reconhece o versículo preenchido', () => {
    const flags = resolveHomeSectionContent({
      contentConfig: { verse: { text: 'Este é o dia que fez o Senhor.' } },
      ...SEM_CONTEUDO_OPCIONAL,
    })
    expect(flags.versiculo).toBe(true)
  })

  it('reconhece o manual dos padrinhos por qualquer um dos campos', () => {
    const flags = resolveHomeSectionContent({
      contentConfig: { groomsmenManual: { palette: [{ name: 'Vinho', hex: '#8b0000' }] } },
      ...SEM_CONTEUDO_OPCIONAL,
    })
    expect(flags['manual-padrinhos']).toBe(true)
  })

  it('cronograma e galeria seguem a contagem de dados, não o texto', () => {
    const flags = resolveHomeSectionContent({
      contentConfig: null,
      eventSegmentCount: 2,
      photoCount: 8,
    })
    expect(flags['grande-dia']).toBe(true)
    expect(flags['nossos-momentos']).toBe(true)
  })

  it('lista esvaziada pelo casal esconde a seção', () => {
    // `[]` é como o casal remove Manual/FAQ — diferente de "nunca customizou",
    // que cai no texto padrão.
    const flags = resolveHomeSectionContent({
      contentConfig: { guestManualTopics: [], faqItems: [] },
      ...SEM_CONTEUDO_OPCIONAL,
    })
    expect(flags['manual-convidados']).toBe(false)
    expect(flags.faq).toBe(false)
  })

  it('não opina sobre as seções que nunca ficam vazias', () => {
    // Boas-vindas, História, RSVP, Dress Code e Presentes têm texto padrão e
    // não entram no mapa — resolveHomeSections lê ausência como "sempre tem".
    const flags = resolveHomeSectionContent({ contentConfig: null, ...SEM_CONTEUDO_OPCIONAL })
    for (const id of ['boas-vindas', 'historia', 'confirmar-presenca', 'dress-code', 'presentes']) {
      expect(flags[id]).toBeUndefined()
    }
  })
})
