import { describe, expect, it } from 'vitest'
import { HOME_SECTION_CATALOG } from '#shared/home-sections'
import {
  SECOES_DO_SAVE_THE_DATE,
  aplicarSaveTheDate,
  simularSaveTheDate,
} from '#shared/save-the-date'

describe('save the date', () => {
  /**
   * O combo é uma COMBINAÇÃO do que já existe. Um id inventado aqui viraria uma
   * seção que o site nunca desenha — e o erro seria mudo: o casal aplicaria o
   * atalho, veria "ligado" na lista e o site continuaria igual.
   */
  it('só usa seções que existem no catálogo', () => {
    const catalogo = HOME_SECTION_CATALOG.map((secao) => secao.id)

    for (const id of SECOES_DO_SAVE_THE_DATE) {
      expect(catalogo).toContain(id)
    }
  })

  /**
   * Desligar o que o casal escolheu seria uma surpresa cara, e o atalho não tem
   * informação para decidir isso por ele.
   */
  it('acrescenta sem nunca desligar o que já estava ligado', () => {
    const resultado = aplicarSaveTheDate(['historia', 'faq'])

    expect(resultado).toContain('historia')
    expect(resultado).toContain('faq')
    for (const id of SECOES_DO_SAVE_THE_DATE) {
      expect(resultado).toContain(id)
    }
  })

  /** A ordem é a do catálogo — nunca a ordem em que as seções foram ligadas. */
  it('devolve as seções na ordem do catálogo', () => {
    const resultado = aplicarSaveTheDate(['faq', 'historia'])
    const posicao = (id: string) => HOME_SECTION_CATALOG.findIndex((secao) => secao.id === id)

    const posicoes = resultado.map(posicao)
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b))
  })

  it('não duplica quando aplicado duas vezes', () => {
    const uma = aplicarSaveTheDate([])
    const duas = aplicarSaveTheDate(uma)

    expect(duas).toEqual(uma)
    expect(new Set(duas).size).toBe(duas.length)
  })

  describe('prévia', () => {
    it('lista o que vai ligar e separa o que já estava', () => {
      const mudanca = simularSaveTheDate(['boas-vindas'], false)

      expect(mudanca.jaLigadas).toEqual(['Boas-vindas'])
      expect(mudanca.secoesParaLigar).toEqual(['O Grande Dia'])
      expect(mudanca.ligaContagem).toBe(true)
    })

    /** Com tudo ligado, a prévia não pode prometer mudança nenhuma. */
    it('fica vazia quando não há o que mudar', () => {
      const mudanca = simularSaveTheDate([...SECOES_DO_SAVE_THE_DATE], true)

      expect(mudanca.secoesParaLigar).toEqual([])
      expect(mudanca.ligaContagem).toBe(false)
    })
  })
})
