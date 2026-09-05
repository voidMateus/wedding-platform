import { describe, expect, it } from 'vitest'
import {
  detectarMapeamento,
  dividirEmLotes,
  normalizarDataDeNascimento,
  prepararImportacao,
} from '#shared/utils/importacao-convidados'
import { gerarModeloImportacao, presetsModelo } from '#shared/utils/modelo-importacao'
import { parsearCsv } from '#shared/utils/csv'

function preparar(csv: string[][], opcoes = {}) {
  return prepararImportacao(csv, detectarMapeamento(csv[0]!), opcoes)
}

describe('detectarMapeamento', () => {
  it('casa as chaves canônicas do nosso próprio modelo', () => {
    const mapa = detectarMapeamento(['nome_completo', 'email', 'grupo'])

    expect(mapa.map((coluna) => coluna.chave)).toEqual(['nome_completo', 'email', 'grupo'])
  })

  it('casa cabeçalho escrito por gente', () => {
    const mapa = detectarMapeamento(['Nome completo', 'Celular', 'E-MAIL'])

    expect(mapa.map((coluna) => coluna.chave)).toEqual(['nome_completo', 'telefone', 'email'])
  })

  it('deixa nula a coluna que não reconhece', () => {
    expect(detectarMapeamento(['mesa do salao'])[0]?.chave).toBeNull()
  })

  it('não aponta duas colunas para o mesmo campo — a segunda sobrescreveria a primeira', () => {
    const mapa = detectarMapeamento(['nome_completo', 'Nome completo'])

    expect(mapa[0]?.chave).toBe('nome_completo')
    expect(mapa[1]?.chave).toBeNull()
  })
})

describe('normalizarDataDeNascimento', () => {
  it('aceita o formato ISO que o modelo gera', () => {
    expect(normalizarDataDeNascimento('1990-05-23')).toBe('1990-05-23')
  })

  it('aceita o formato que uma pessoa digita no Brasil', () => {
    expect(normalizarDataDeNascimento('23/05/1990')).toBe('1990-05-23')
    expect(normalizarDataDeNascimento('5/7/1988')).toBe('1988-07-05')
  })

  it('recusa data que não existe, em vez de "corrigir" em silêncio', () => {
    expect(normalizarDataDeNascimento('31/02/1990')).toBeNull()
    expect(normalizarDataDeNascimento('1990-13-01')).toBeNull()
  })

  it('recusa texto que não é data', () => {
    expect(normalizarDataDeNascimento('ano que vem')).toBeNull()
    expect(normalizarDataDeNascimento('')).toBeNull()
  })
})

describe('prepararImportacao', () => {
  it('prepara linhas de cadastro novo', () => {
    const resultado = preparar([
      ['nome_completo', 'email'],
      ['Maria Silva', 'maria@exemplo.com'],
      ['João Souza', ''],
    ])

    expect(resultado.erros).toEqual([])
    expect(resultado.linhas).toHaveLength(2)
    expect(resultado.resumo.criar).toBe(2)
    expect(resultado.resumo.atualizar).toBe(0)
    expect(resultado.linhas[0]?.dados.nome_completo).toBe('Maria Silva')
  })

  it('trata linha com id como atualização', () => {
    const resultado = preparar([
      ['id', 'grupo'],
      ['11111111-1111-1111-1111-111111111111', 'Trabalho'],
    ])

    expect(resultado.erros).toEqual([])
    expect(resultado.resumo.atualizar).toBe(1)
    expect(resultado.linhas[0]?.acao).toBe('atualizar')
  })

  it('só inclui as chaves que a planilha trouxe — é o que impede zerar coluna ausente', () => {
    const resultado = preparar([
      ['id', 'grupo'],
      ['11111111-1111-1111-1111-111111111111', 'Trabalho'],
    ])

    expect(Object.keys(resultado.linhas[0]!.dados).sort()).toEqual(['grupo', 'id'])
  })

  it('exige nome para cadastrar alguém novo', () => {
    const resultado = preparar([
      ['nome_completo', 'email'],
      ['', 'sem-nome@exemplo.com'],
    ])

    expect(resultado.linhas).toHaveLength(0)
    expect(resultado.erros[0]?.linha).toBe(2)
  })

  it('não exige nome quando a linha só atualiza', () => {
    const resultado = preparar([
      ['id', 'telefone'],
      ['11111111-1111-1111-1111-111111111111', '(11) 90000-0000'],
    ])

    expect(resultado.erros).toEqual([])
    expect(resultado.linhas).toHaveLength(1)
  })

  it('recusa identificador que não é uuid', () => {
    const resultado = preparar([
      ['id', 'nome_completo'],
      ['42', 'Maria Silva'],
    ])

    expect(resultado.linhas).toHaveLength(0)
    expect(resultado.erros[0]?.mensagem).toContain('Identificador')
  })

  it('aceita rótulo de enum e converte para o valor gravado', () => {
    const resultado = preparar([
      ['nome_completo', 'faixa_etaria_manual', 'sexo'],
      ['Maria Silva', 'Criança', 'Feminino'],
    ])

    expect(resultado.linhas[0]?.dados.faixa_etaria_manual).toBe('crianca')
    expect(resultado.linhas[0]?.dados.sexo).toBe('feminino')
  })

  it('recusa valor fora do enum dizendo o que é aceito', () => {
    const resultado = preparar([
      ['nome_completo', 'faixa_etaria_manual'],
      ['Maria Silva', 'bebê'],
    ])

    expect(resultado.linhas).toHaveLength(0)
    expect(resultado.erros[0]?.mensagem).toContain('Criança')
  })

  it('converte data brasileira e recusa data impossível', () => {
    const resultado = preparar([
      ['nome_completo', 'data_nascimento'],
      ['Maria Silva', '23/05/1990'],
      ['João Souza', '31/02/1990'],
    ])

    expect(resultado.linhas).toHaveLength(1)
    expect(resultado.linhas[0]?.dados.data_nascimento).toBe('1990-05-23')
    expect(resultado.erros[0]?.linha).toBe(3)
  })

  it('avisa que a faixa manual perde para a data de nascimento, em vez de descartar calado', () => {
    const resultado = preparar([
      ['nome_completo', 'data_nascimento', 'faixa_etaria_manual'],
      ['Maria Silva', '1990-05-23', 'Criança'],
    ])

    expect(resultado.linhas).toHaveLength(1)
    expect(resultado.avisos.some((aviso) => aviso.linha === 2)).toBe(true)
  })

  it('avisa e ignora coluna calculada pelo sistema', () => {
    const resultado = preparar([
      ['nome_completo', 'faixa_etaria_calculada', 'status_rsvp'],
      ['Maria Silva', 'Adulto', 'Estará lá'],
    ])

    expect(Object.keys(resultado.linhas[0]!.dados)).toEqual(['nome_completo'])
    expect(resultado.avisos.length).toBeGreaterThanOrEqual(2)
  })

  it('avisa sobre coluna desconhecida sem transformá-la em erro', () => {
    const resultado = preparar([
      ['nome_completo', 'mesa do salao'],
      ['Maria Silva', '12'],
    ])

    expect(resultado.erros).toEqual([])
    expect(resultado.linhas).toHaveLength(1)
    expect(resultado.avisos.some((aviso) => aviso.mensagem.includes('mesa do salao'))).toBe(true)
  })

  it('ignora a linha de exemplo que o casal esqueceu de apagar', () => {
    const csv = parsearCsv(gerarModeloImportacao(['nome_completo', 'email']))
    const resultado = preparar(csv as string[][])

    expect(resultado.exemplosIgnorados).toBe(1)
    expect(resultado.linhas).toHaveLength(0)
    expect(resultado.erros).toEqual([])
  })

  it('junta os nomes distintos de grupo e convite, ignorando acento e caixa', () => {
    const resultado = preparar([
      ['nome_completo', 'grupo', 'convite'],
      ['Maria Silva', 'Família da Noiva', 'Família Silva'],
      ['João Souza', 'familia da noiva', 'FAMÍLIA SILVA'],
    ])

    expect(resultado.resumo.grupos).toEqual(['Família da Noiva'])
    expect(resultado.resumo.convites).toEqual(['Família Silva'])
  })

  it('não conta como novo o vínculo que já existe no casamento', () => {
    const resultado = preparar(
      [
        ['nome_completo', 'grupo'],
        ['Maria Silva', 'familia da noiva'],
        ['João Souza', 'Trabalho'],
      ],
      { gruposExistentes: ['Família da Noiva'] },
    )

    expect(resultado.resumo.grupos).toEqual(['Trabalho'])
  })

  it('uma linha ruim não derruba as boas', () => {
    const resultado = preparar([
      ['nome_completo', 'data_nascimento'],
      ['Maria Silva', '1990-05-23'],
      ['João Souza', 'ontem'],
      ['Ana Lima', '1988-01-02'],
    ])

    expect(resultado.linhas).toHaveLength(2)
    expect(resultado.erros).toHaveLength(1)
    expect(resultado.erros[0]?.linha).toBe(3)
  })

  it('numera as linhas como o Excel — cabeçalho é a linha 1', () => {
    const resultado = preparar([['nome_completo'], ['Maria Silva'], ['']])

    expect(resultado.erros[0]?.linha).toBe(3)
  })
})

describe('dividirEmLotes', () => {
  it('fatia no tamanho pedido', () => {
    expect(dividirEmLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('devolve um lote só quando cabe', () => {
    expect(dividirEmLotes([1, 2], 10)).toEqual([[1, 2]])
  })

  it('devolve vazio para lista vazia', () => {
    expect(dividirEmLotes([], 10)).toEqual([])
  })
})

/**
 * O contrato central das duas fases: o que o gerador produz, o importador
 * consome sem erro. Campo novo no catálogo sem suporte na leitura quebra aqui.
 */
describe('modelo gerado volta pelo importador', () => {
  for (const preset of presetsModelo()) {
    it(`preset "${preset.rotulo}" preenchido é aceito sem erro`, () => {
      const csv = parsearCsv(gerarModeloImportacao(preset.campos, { comExemplo: false }))
      const cabecalho = csv[0]!

      // Preenche a planilha como o casal faria: nome em todas, e nas colunas
      // de enum um dos rótulos aceitos.
      const linha = cabecalho.map((chave) => {
        if (chave === 'nome_completo') return 'Maria Silva'
        if (chave === 'sexo') return 'Feminino'
        if (chave === 'faixa_etaria_manual') return 'Adulto'
        if (chave === 'papel_casamento') return 'Madrinha'
        if (chave === 'data_nascimento') return '23/05/1990'
        if (chave === 'email') return 'maria@exemplo.com'
        if (chave === 'id') return ''
        return 'valor'
      })

      const resultado = preparar([cabecalho, linha])

      expect(resultado.erros).toEqual([])
      expect(resultado.linhas).toHaveLength(1)
    })
  }
})
