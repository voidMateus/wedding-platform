import { describe, expect, it } from 'vitest'
import {
  FAIXAS_ETARIAS_PADRAO,
  calcularIdadeNaData,
  classificarFaixaEtaria,
  descreverLimitesFaixaEtaria,
  limitesNascimentoFaixaEtaria,
  resolverFaixasEtarias,
  type FaixaEtaria,
} from '#shared/utils/faixa-etaria'

/**
 * O núcleo da classificação etária (CLAUDE.md, seção 12). Os casos de virada
 * de aniversário e de limite de faixa são o motivo de este cálculo existir num
 * lugar só: eram exatamente eles que um "ano do evento - ano de nascimento"
 * errava.
 */

const DATA_EVENTO = '2027-05-16'

/** Configuração alternativa do mesmo evento — criança até 7, não até 11. */
const FAIXAS_CRIANCA_ATE_7: FaixaEtaria[] = [
  { chave: 'crianca', idadeMinima: 0, idadeMaxima: 7 },
  { chave: 'adolescente', idadeMinima: 8, idadeMaxima: 17 },
  { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
  { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
]

function convidado(dataNascimento: string | null, faixaManual: string | null = null) {
  return { data_nascimento: dataNascimento, faixa_etaria_manual: faixaManual }
}

describe('calcularIdadeNaData', () => {
  it('aniversário antes do evento: já fez, conta o ano', () => {
    expect(calcularIdadeNaData('2009-05-15', DATA_EVENTO)).toBe(18)
  })

  it('aniversário depois do evento: ainda não fez, um ano menos', () => {
    expect(calcularIdadeNaData('2009-05-17', DATA_EVENTO)).toBe(17)
  })

  it('aniversário exatamente no dia do evento conta como feito', () => {
    expect(calcularIdadeNaData('2009-05-16', DATA_EVENTO)).toBe(18)
  })

  it('usa a data do evento como referência, não a data de hoje', () => {
    // Mesma pessoa, dois eventos: a idade muda porque a referência muda.
    expect(calcularIdadeNaData('2015-08-20', '2027-05-16')).toBe(11)
    expect(calcularIdadeNaData('2015-08-20', '2027-08-20')).toBe(12)
  })

  it('considera mês e dia, não só a diferença de anos', () => {
    expect(calcularIdadeNaData('2009-12-31', '2027-01-01')).toBe(17)
  })

  it('sem data de nascimento (ou com data inválida), não há idade', () => {
    expect(calcularIdadeNaData(null, DATA_EVENTO)).toBeNull()
    expect(calcularIdadeNaData('', DATA_EVENTO)).toBeNull()
    expect(calcularIdadeNaData('não é data', DATA_EVENTO)).toBeNull()
    expect(calcularIdadeNaData('2009-05-15', null)).toBeNull()
  })

  it('aceita timestamp ISO completo na referência (fuso não desloca o dia)', () => {
    expect(calcularIdadeNaData('2009-05-16', '2027-05-16T23:30:00-03:00')).toBe(18)
  })
})

describe('classificarFaixaEtaria — limites das faixas padrão', () => {
  const casos: Array<[number, string]> = [
    [11, 'crianca'],
    [12, 'adolescente'],
    [17, 'adolescente'],
    [18, 'adulto'],
    [59, 'adulto'],
    [60, 'idoso'],
  ]

  for (const [idade, chaveEsperada] of casos) {
    it(`${idade} anos no evento → ${chaveEsperada}`, () => {
      // Nascimento no mesmo dia/mês do evento: a idade no evento é exata.
      const nascimento = `${2027 - idade}-05-16`
      const resultado = classificarFaixaEtaria(
        convidado(nascimento),
        FAIXAS_ETARIAS_PADRAO,
        DATA_EVENTO,
      )
      expect(resultado.idadeNoEvento).toBe(idade)
      expect(resultado.chave).toBe(chaveEsperada)
      expect(resultado.origem).toBe('calculada')
    })
  }

  it('respeita o limite superior de uma faixa com máximo 7 (7 → criança, 8 → adolescente)', () => {
    const seteAnos = classificarFaixaEtaria(
      convidado('2020-05-16'),
      FAIXAS_CRIANCA_ATE_7,
      DATA_EVENTO,
    )
    const oitoAnos = classificarFaixaEtaria(
      convidado('2019-05-16'),
      FAIXAS_CRIANCA_ATE_7,
      DATA_EVENTO,
    )
    expect(seteAnos.chave).toBe('crianca')
    expect(oitoAnos.chave).toBe('adolescente')
  })
})

describe('classificarFaixaEtaria — a regra pertence ao evento', () => {
  it('a MESMA pessoa é classificada de formas diferentes conforme a configuração', () => {
    const joao = convidado('2015-08-20')

    expect(classificarFaixaEtaria(joao, FAIXAS_CRIANCA_ATE_7, DATA_EVENTO).chave).toBe(
      'adolescente',
    )
    expect(classificarFaixaEtaria(joao, FAIXAS_ETARIAS_PADRAO, DATA_EVENTO).chave).toBe('crianca')
  })
})

describe('classificarFaixaEtaria — prioridade e ausência de dados', () => {
  it('sem nascimento, vale a faixa informada manualmente', () => {
    const resultado = classificarFaixaEtaria(
      convidado(null, 'crianca'),
      FAIXAS_ETARIAS_PADRAO,
      DATA_EVENTO,
    )
    expect(resultado.chave).toBe('crianca')
    expect(resultado.origem).toBe('manual')
    expect(resultado.idadeNoEvento).toBeNull()
  })

  it('sem nascimento e sem faixa manual, a classificação é não informada', () => {
    const resultado = classificarFaixaEtaria(convidado(null), FAIXAS_ETARIAS_PADRAO, DATA_EVENTO)
    expect(resultado.chave).toBeNull()
    expect(resultado.origem).toBe('nao_informada')
  })

  it('data de nascimento tem prioridade sobre a faixa manual divergente', () => {
    // Cadastrado à mão como adulto, mas nasceu em 2015: vale a idade real.
    const resultado = classificarFaixaEtaria(
      convidado('2015-08-20', 'adulto'),
      FAIXAS_ETARIAS_PADRAO,
      DATA_EVENTO,
    )
    expect(resultado.chave).toBe('crianca')
    expect(resultado.origem).toBe('calculada')
  })

  it('faixa manual fora do catálogo é ignorada, não vira classificação', () => {
    const resultado = classificarFaixaEtaria(
      convidado(null, 'bebe'),
      FAIXAS_ETARIAS_PADRAO,
      DATA_EVENTO,
    )
    expect(resultado.chave).toBeNull()
    expect(resultado.origem).toBe('nao_informada')
  })

  it('idade que não cai em nenhuma faixa configurada fica sem classificação', () => {
    // Configuração parcial (o formato previsto para finalidades futuras, ex.:
    // recreação de 0 a 7): quem tem 30 anos simplesmente não se classifica.
    const somenteCriancas: FaixaEtaria[] = [{ chave: 'crianca', idadeMinima: 0, idadeMaxima: 7 }]
    const resultado = classificarFaixaEtaria(convidado('1997-05-16'), somenteCriancas, DATA_EVENTO)
    expect(resultado.idadeNoEvento).toBe(30)
    expect(resultado.chave).toBeNull()
  })

  it('sem data do evento não há classificação calculada — a faixa manual assume', () => {
    const resultado = classificarFaixaEtaria(
      convidado('2015-08-20', 'crianca'),
      FAIXAS_ETARIAS_PADRAO,
      null,
    )
    expect(resultado.origem).toBe('manual')
  })
})

describe('limitesNascimentoFaixaEtaria', () => {
  it('traduz a faixa em intervalo de datas de nascimento coerente com o cálculo de idade', () => {
    const adulto = FAIXAS_ETARIAS_PADRAO[2]!
    const limites = limitesNascimentoFaixaEtaria(adulto, DATA_EVENTO)

    // 18 anos: nascido até 16/05/2009. 59 anos: nascido depois de 16/05/1967.
    expect(limites.nascidoAte).toBe('2009-05-16')
    expect(limites.nascidoDepoisDe).toBe('1967-05-16')
  })

  it('faixa aberta no topo não tem limite inferior de nascimento', () => {
    const idoso = FAIXAS_ETARIAS_PADRAO[3]!
    expect(limitesNascimentoFaixaEtaria(idoso, DATA_EVENTO)).toEqual({
      nascidoAte: '1967-05-16',
      nascidoDepoisDe: null,
    })
  })

  it('o intervalo classifica exatamente quem a função de idade classificaria', () => {
    const faixa = FAIXAS_ETARIAS_PADRAO[0]!
    const limites = limitesNascimentoFaixaEtaria(faixa, DATA_EVENTO)

    for (const nascimento of ['2015-08-20', '2027-05-16', '2015-05-17', '2015-05-15']) {
      const dentroDoIntervalo =
        nascimento <= limites.nascidoAte &&
        (limites.nascidoDepoisDe === null || nascimento > limites.nascidoDepoisDe)
      const classificado =
        classificarFaixaEtaria(convidado(nascimento), FAIXAS_ETARIAS_PADRAO, DATA_EVENTO).chave ===
        faixa.chave
      expect(dentroDoIntervalo).toBe(classificado)
    }
  })

  it('29/02 não escorrega para março ao subtrair anos', () => {
    // Evento em 29/02/2028; quem nasceu em 01/03/2010 ainda tem 17 no evento,
    // então o limite dos 18 anos precisa parar em 28/02/2010.
    const adulto = FAIXAS_ETARIAS_PADRAO[2]!
    expect(limitesNascimentoFaixaEtaria(adulto, '2028-02-29').nascidoAte).toBe('2010-02-28')
    expect(calcularIdadeNaData('2010-03-01', '2028-02-29')).toBe(17)
    expect(calcularIdadeNaData('2010-02-28', '2028-02-29')).toBe(18)
  })
})

describe('resolverFaixasEtarias', () => {
  it('devolve o padrão quando a coluna está vazia ou fora do formato', () => {
    expect(resolverFaixasEtarias(null)).toEqual(FAIXAS_ETARIAS_PADRAO)
    expect(resolverFaixasEtarias({})).toEqual(FAIXAS_ETARIAS_PADRAO)
    expect(resolverFaixasEtarias({ principal: [] })).toEqual(FAIXAS_ETARIAS_PADRAO)
    expect(resolverFaixasEtarias({ principal: [{ chave: 'bebe', idadeMinima: 0 }] })).toEqual(
      FAIXAS_ETARIAS_PADRAO,
    )
  })

  it('lê as faixas configuradas do evento', () => {
    expect(resolverFaixasEtarias({ principal: FAIXAS_CRIANCA_ATE_7 })).toEqual(FAIXAS_CRIANCA_ATE_7)
  })

  it('trata idadeMaxima ausente como faixa aberta no topo', () => {
    expect(resolverFaixasEtarias({ principal: [{ chave: 'adulto', idadeMinima: 18 }] })).toEqual([
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: null },
    ])
  })
})

describe('descreverLimitesFaixaEtaria', () => {
  it('descreve faixa fechada e faixa aberta', () => {
    expect(descreverLimitesFaixaEtaria(FAIXAS_ETARIAS_PADRAO[0]!)).toBe('0 a 11 anos')
    expect(descreverLimitesFaixaEtaria(FAIXAS_ETARIAS_PADRAO[3]!)).toBe('60 anos ou mais')
  })
})
