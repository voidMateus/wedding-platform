import { describe, expect, it } from 'vitest'
import { camposExportaveis, campoPorChave } from '#shared/utils/campos-convidado'
import {
  colunasSomenteLeitura,
  gerarCsvExportacao,
  montarLinhasExportacao,
  nomeDoArquivoDaExportacao,
  valorExportado,
  type ConvidadoExportavel,
} from '#shared/utils/exportacao-convidados'
import { BOM_UTF8, parsearCsv } from '#shared/utils/csv'
import { FAIXAS_ETARIAS_PADRAO } from '#shared/utils/faixa-etaria'

const CONTEXTO = { faixas: FAIXAS_ETARIAS_PADRAO, dataEvento: '2027-07-02' }

function convidado(overrides: Partial<ConvidadoExportavel> = {}): ConvidadoExportavel {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    nome_completo: 'Maria Silva',
    apelido: 'Mari',
    sexo: 'feminino',
    data_nascimento: '1990-05-23',
    faixa_etaria_manual: null,
    email: 'maria@exemplo.com',
    telefone: '(11) 91234-5678',
    papel_casamento: 'madrinha',
    observacoes: 'Chega cedo',
    grupoNome: 'Família da Noiva',
    conviteNome: 'Família Silva',
    statusRsvp: 'confirmado',
    ...overrides,
  }
}

function celula(chave: string, linha: ConvidadoExportavel): string {
  return valorExportado(campoPorChave(chave)!, linha, CONTEXTO)
}

describe('valorExportado', () => {
  it('lê campo de coluna direto', () => {
    expect(celula('nome_completo', convidado())).toBe('Maria Silva')
    expect(celula('email', convidado())).toBe('maria@exemplo.com')
  })

  it('devolve string vazia para coluna nula, nunca "null"', () => {
    expect(celula('apelido', convidado({ apelido: null }))).toBe('')
    expect(celula('observacoes', convidado({ observacoes: null }))).toBe('')
  })

  it('resolve vínculo pelo nome, não pelo identificador', () => {
    expect(celula('grupo', convidado())).toBe('Família da Noiva')
    expect(celula('convite', convidado())).toBe('Família Silva')
  })

  it('deixa vínculo vazio em branco — convidado sem convite é estado legítimo', () => {
    expect(celula('convite', convidado({ conviteNome: null }))).toBe('')
  })

  it('escreve enum com o rótulo legível, não a chave crua', () => {
    expect(celula('sexo', convidado())).toBe('Feminino')
    expect(celula('papel_casamento', convidado())).toBe('Madrinha')
    expect(celula('status_rsvp', convidado())).toBe('Estará lá')
  })

  it('trata ausência de resposta como Pendente, não como célula vazia', () => {
    expect(celula('status_rsvp', convidado({ statusRsvp: null }))).toBe('Pendente')
  })

  it('calcula a faixa etária na data do evento, não hoje', () => {
    // Nascida em 1990-05-23, o evento é 2027-07-02 → 37 anos → Adulto.
    expect(celula('faixa_etaria_calculada', convidado())).toBe('Adulto')
  })

  it('usa a faixa manual só quando não há data de nascimento', () => {
    const semData = convidado({ data_nascimento: null, faixa_etaria_manual: 'idoso' })
    expect(celula('faixa_etaria_calculada', semData)).toBe('Idoso')

    // Com data válida, a data vence a faixa manual (CLAUDE.md, seção 12).
    const comAmbos = convidado({ faixa_etaria_manual: 'crianca' })
    expect(celula('faixa_etaria_calculada', comAmbos)).toBe('Adulto')
  })

  it('deixa a faixa vazia quando não há data nem faixa manual', () => {
    const semNada = convidado({ data_nascimento: null, faixa_etaria_manual: null })
    expect(celula('faixa_etaria_calculada', semNada)).toBe('')
  })

  it('exporta a faixa informada como rótulo, separada da calculada', () => {
    const semData = convidado({ data_nascimento: null, faixa_etaria_manual: 'crianca' })
    expect(celula('faixa_etaria_manual', semData)).toBe('Criança')
  })
})

describe('montarLinhasExportacao', () => {
  it('usa exatamente os campos exportáveis do catálogo, na ordem dele', () => {
    const [cabecalho] = montarLinhasExportacao([], CONTEXTO)

    expect(cabecalho).toEqual(camposExportaveis().map((campo) => campo.chave))
  })

  it('exporta os campos derivados que o modelo de importação não oferece', () => {
    const [cabecalho] = montarLinhasExportacao([], CONTEXTO)

    expect(cabecalho).toContain('faixa_etaria_calculada')
    expect(cabecalho).toContain('status_rsvp')
    expect(cabecalho).toContain('id')
  })

  it('gera uma linha por convidado, além do cabeçalho', () => {
    const linhas = montarLinhasExportacao([convidado(), convidado()], CONTEXTO)

    expect(linhas).toHaveLength(3)
    expect(linhas[1]).toHaveLength(linhas[0]!.length)
  })

  it('devolve só o cabeçalho quando o recorte não tem ninguém', () => {
    expect(montarLinhasExportacao([], CONTEXTO)).toHaveLength(1)
  })
})

describe('gerarCsvExportacao', () => {
  it('sai com BOM, para o Excel em pt-BR não quebrar os acentos', () => {
    expect(gerarCsvExportacao([convidado()], CONTEXTO).startsWith(BOM_UTF8)).toBe(true)
  })

  it('sobrevive à ida e volta pelo parser, com acento e separador no valor', () => {
    const comPontoEVirgula = convidado({ observacoes: 'Chega cedo; avisar à cerimonialista' })
    const linhas = parsearCsv(gerarCsvExportacao([comPontoEVirgula], CONTEXTO))
    const indice = linhas[0]!.indexOf('observacoes')

    expect(linhas[1]?.[indice]).toBe('Chega cedo; avisar à cerimonialista')
  })
})

describe('colunasSomenteLeitura', () => {
  it('nomeia o que a exportação produz e a importação recusa', () => {
    expect(colunasSomenteLeitura()).toEqual(['Faixa etária (final)', 'Status do RSVP'])
  })
})

describe('nomeDoArquivoDaExportacao', () => {
  it('carrega a data', () => {
    expect(nomeDoArquivoDaExportacao(new Date('2026-09-04T12:00:00Z'))).toBe(
      'convidados-2026-09-04.csv',
    )
  })
})
