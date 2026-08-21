import { describe, expect, it } from 'vitest'
import { splitParagraphs } from '#shared/utils/split-paragraphs'

describe('splitParagraphs', () => {
  it('separa por linha em branco', () => {
    expect(splitParagraphs('Primeiro parágrafo.\n\nSegundo parágrafo.')).toEqual([
      'Primeiro parágrafo.',
      'Segundo parágrafo.',
    ])
  })

  it('texto sem linha em branco vira um único parágrafo', () => {
    expect(splitParagraphs('Só uma frase.')).toEqual(['Só uma frase.'])
  })

  it('remove espaços em branco extras ao redor de cada parágrafo', () => {
    expect(splitParagraphs('  A.  \n\n  B.  ')).toEqual(['A.', 'B.'])
  })

  it('ignora linhas em branco extras/consecutivas sem gerar parágrafos vazios', () => {
    expect(splitParagraphs('A.\n\n\n\nB.')).toEqual(['A.', 'B.'])
  })

  it('string vazia vira lista vazia', () => {
    expect(splitParagraphs('')).toEqual([])
  })
})
