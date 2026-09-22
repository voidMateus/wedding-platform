import { describe, expect, it } from 'vitest'
import {
  gerarCsvDeFornecedores,
  montarLinhasDeFornecedores,
  nomeDoArquivoDeFornecedores,
  type FornecedorExportavel,
} from '#shared/utils/exportacao-fornecedores'

const BASE: FornecedorExportavel = {
  nome: 'Buffet Recanto',
  gasto: 'Jantar dos convidados',
  categoria: 'Buffet',
  nomeContato: 'Leila',
  telefone: '(11) 99999-0000',
  email: 'contato@recanto.com.br',
  contratadoCentavos: 1_800_000,
  aPagarCentavos: 600_000,
  situacaoFinanceira: 'a_pagar',
}

describe('exportação de fornecedores', () => {
  it('abre com o cabeçalho e traz uma linha por fornecedor', () => {
    const linhas = montarLinhasDeFornecedores([BASE])

    expect(linhas[0]).toEqual([
      'Fornecedor',
      'Gasto',
      'Categoria',
      'Contato',
      'Telefone',
      'E-mail',
      'Valor fechado',
      'Falta pagar',
      'Situação',
    ])
    expect(linhas).toHaveLength(2)
    expect(linhas[1]?.[0]).toBe('Buffet Recanto')
    expect(linhas[1]?.at(-1)).toBe('A pagar')
  })

  /**
   * Célula vazia é ausência; "R$ 0,00" é um valor. Fornecedor que só cotou não
   * tem valor fechado nenhum — escrever zero ali diria que ele custou zero.
   */
  it('deixa o dinheiro em branco quando não há contrato', () => {
    const linhas = montarLinhasDeFornecedores([
      { ...BASE, contratadoCentavos: 0, aPagarCentavos: 0, situacaoFinanceira: 'sem_despesa' },
    ])

    expect(linhas[1]?.[6]).toBe('')
    expect(linhas[1]?.[7]).toBe('')
    expect(linhas[1]?.at(-1)).toBe('Sem gasto definido')
  })

  it('escapa o que quebraria a planilha', () => {
    const csv = gerarCsvDeFornecedores([{ ...BASE, nome: 'Buffet "Recanto"; Festas' }])

    expect(csv).toContain('"Buffet ""Recanto""; Festas"')
  })

  it('nomeia o arquivo pela data', () => {
    expect(nomeDoArquivoDeFornecedores(new Date('2026-09-22T12:00:00Z'))).toBe(
      'fornecedores-2026-09-22.csv',
    )
  })
})
