import { describe, expect, it } from 'vitest'
import {
  gerarCsvPresentes,
  nomeDoArquivoDePresentes,
  type PresenteExportavel,
} from '#shared/utils/exportacao-presentes'
import { BOM_UTF8, parsearCsv } from '#shared/utils/csv'

const base: PresenteExportavel = {
  titulo: 'Jogo de panelas',
  categoriaNome: 'Cozinha',
  ePresenteCota: false,
  status: 'Disponível',
  valorCentavos: 45000,
  arrecadadoCentavos: null,
  quantidadeDisponivel: 2,
  presenteadoPor: [],
}

function linhasDe(csv: string): string[][] {
  return parsearCsv(csv)
}

describe('gerarCsvPresentes', () => {
  it('escreve o cabeçalho mesmo sem nenhum presente', () => {
    const linhas = linhasDe(gerarCsvPresentes([]))

    expect(linhas).toHaveLength(1)
    expect(linhas[0]?.[0]).toBe('Presente')
  })

  it('sai com BOM — sem ele o Excel abre "João" como "JoÃ£o"', () => {
    expect(gerarCsvPresentes([base]).startsWith(BOM_UTF8)).toBe(true)
  })

  it('escreve o valor em formato brasileiro e sem "R$", para a coluna somar', () => {
    const linhas = linhasDe(gerarCsvPresentes([base]))

    expect(linhas[1]?.[4]).toBe('450,00')
    expect(linhas[1]?.[4]).not.toContain('R$')
  })

  it('deixa vazio, nunca zero, o que não existe', () => {
    const linhas = linhasDe(
      gerarCsvPresentes([{ ...base, valorCentavos: null, arrecadadoCentavos: null }]),
    )

    expect(linhas[1]?.[4]).toBe('')
    expect(linhas[1]?.[5]).toBe('')
  })

  it('cota não leva quantidade — "0" ali diria esgotado sobre o que nunca esgota', () => {
    const linhas = linhasDe(
      gerarCsvPresentes([{ ...base, ePresenteCota: true, quantidadeDisponivel: 0 }]),
    )

    expect(linhas[1]?.[2]).toBe('Cota')
    expect(linhas[1]?.[6]).toBe('')
  })

  it('junta os presenteadores numa coluna só', () => {
    const linhas = linhasDe(
      gerarCsvPresentes([{ ...base, presenteadoPor: ['Ana', 'João', 'Tia Cléia'] }]),
    )

    expect(linhas[1]?.[7]).toBe('Ana, João, Tia Cléia')
  })

  it('sobrevive a nome com ponto e vírgula, aspas e quebra de linha', () => {
    const linhas = linhasDe(
      gerarCsvPresentes([
        { ...base, titulo: 'Panela "grande"; nova', presenteadoPor: ['Ana\nMaria'] },
      ]),
    )

    expect(linhas[1]?.[0]).toBe('Panela "grande"; nova')
    expect(linhas[1]?.[7]).toBe('Ana\nMaria')
  })

  it('uma linha por presente, na ordem recebida', () => {
    const linhas = linhasDe(
      gerarCsvPresentes([base, { ...base, titulo: 'Lua de mel' }, { ...base, titulo: 'Airfryer' }]),
    )

    expect(linhas.slice(1).map((linha) => linha[0])).toEqual([
      'Jogo de panelas',
      'Lua de mel',
      'Airfryer',
    ])
  })
})

describe('nomeDoArquivoDePresentes', () => {
  it('carrega a data para não sobrescrever a exportação anterior', () => {
    expect(nomeDoArquivoDePresentes(new Date('2026-09-13T15:00:00Z'))).toBe(
      'presentes-2026-09-13.csv',
    )
  })
})
