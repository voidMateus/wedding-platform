import { describe, expect, it } from 'vitest'
import {
  BOM_UTF8,
  SEPARADOR_PADRAO,
  detectarSeparador,
  parsearCsv,
  removerBom,
  serializarCsv,
} from '#shared/utils/csv'

describe('serializarCsv', () => {
  it('escreve com `;` e BOM — o que o Excel em pt-BR espera', () => {
    const csv = serializarCsv([['nome_completo', 'email']])

    expect(csv.startsWith(BOM_UTF8)).toBe(true)
    expect(csv).toContain(`nome_completo${SEPARADOR_PADRAO}email`)
  })

  it('separa linhas com CRLF', () => {
    expect(serializarCsv([['a'], ['b']], { comBom: false })).toBe('a\r\nb')
  })

  it('põe entre aspas o valor que contém o separador', () => {
    expect(serializarCsv([['Silva; Maria']], { comBom: false })).toBe('"Silva; Maria"')
  })

  it('duplica aspas internas', () => {
    expect(serializarCsv([['Maria "Mari" Silva']], { comBom: false })).toBe(
      '"Maria ""Mari"" Silva"',
    )
  })

  it('põe entre aspas o valor com quebra de linha', () => {
    expect(serializarCsv([['linha 1\nlinha 2']], { comBom: false })).toBe('"linha 1\nlinha 2"')
  })

  it('não põe aspas à toa', () => {
    expect(serializarCsv([['Maria Silva', 'maria@exemplo.com']], { comBom: false })).toBe(
      'Maria Silva;maria@exemplo.com',
    )
  })
})

describe('detectarSeparador', () => {
  it('reconhece `;` (Excel pt-BR)', () => {
    expect(detectarSeparador('nome;email;telefone')).toBe(';')
  })

  it('reconhece `,` (Google Sheets)', () => {
    expect(detectarSeparador('nome,email,telefone')).toBe(',')
  })

  it('reconhece tabulação (colado de outra planilha)', () => {
    expect(detectarSeparador('nome\temail\ttelefone')).toBe('\t')
  })

  it('ignora separador dentro de aspas — "Silva, Maria" não faz o arquivo virar CSV por vírgula', () => {
    expect(detectarSeparador('nome;observacoes\n"Silva, Maria";"a, b, c"')).toBe(';')
  })

  it('cai no padrão com uma coluna só (nenhum separador presente)', () => {
    expect(detectarSeparador('nome_completo')).toBe(SEPARADOR_PADRAO)
  })
})

describe('parsearCsv', () => {
  it('lê o que serializarCsv escreveu, incluindo BOM', () => {
    const original = [
      ['nome_completo', 'observacoes'],
      ['Maria Silva', 'Chega cedo; avisar'],
    ]

    expect(parsearCsv(serializarCsv(original))).toEqual(original)
  })

  it('lê arquivo do Google Sheets: vírgula e sem BOM', () => {
    expect(parsearCsv('nome_completo,email\nMaria Silva,maria@exemplo.com')).toEqual([
      ['nome_completo', 'email'],
      ['Maria Silva', 'maria@exemplo.com'],
    ])
  })

  it('preserva o separador dentro de campo entre aspas', () => {
    expect(parsearCsv('nome;obs\n"Silva; Maria";ok')).toEqual([
      ['nome', 'obs'],
      ['Silva; Maria', 'ok'],
    ])
  })

  it('lê quebra de linha dentro de campo entre aspas sem partir a linha', () => {
    expect(parsearCsv('nome;obs\nMaria;"linha 1\nlinha 2"')).toEqual([
      ['nome', 'obs'],
      ['Maria', 'linha 1\nlinha 2'],
    ])
  })

  it('lê aspas escapadas', () => {
    expect(parsearCsv('nome\n"Maria ""Mari"" Silva"')).toEqual([['nome'], ['Maria "Mari" Silva']])
  })

  it('descarta a linha vazia que o Excel deixa no fim', () => {
    expect(parsearCsv('nome\r\nMaria\r\n')).toEqual([['nome'], ['Maria']])
  })

  it('descarta linha só com separadores', () => {
    expect(parsearCsv('nome;email\nMaria;maria@exemplo.com\n;')).toEqual([
      ['nome', 'email'],
      ['Maria', 'maria@exemplo.com'],
    ])
  })

  it('preserva célula vazia no meio da linha', () => {
    expect(parsearCsv('a;b;c\n1;;3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ])
  })

  it('aceita CR sozinho como fim de linha', () => {
    expect(parsearCsv('nome\rMaria')).toEqual([['nome'], ['Maria']])
  })
})

describe('removerBom', () => {
  it('remove só quando existe', () => {
    expect(removerBom(`${BOM_UTF8}nome`)).toBe('nome')
    expect(removerBom('nome')).toBe('nome')
  })
})
