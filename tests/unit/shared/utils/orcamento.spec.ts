import { describe, expect, it } from 'vitest'
import {
  DIAS_HORIZONTE_VENCIMENTO,
  gerarParcelas,
  hojeNoFusoDoEvento,
  linhaDeCategoria,
  percentual,
  resumoDeCotacoes,
  resumoDoOrcamento,
  situacaoDaParcela,
  situacaoFinanceiraFornecedor,
  somarDias,
  totaisDaDespesa,
  type DespesaCalculavel,
  type GrupoDeCategoria,
} from '#shared/utils/orcamento'

/**
 * O núcleo do Financeiro (docs/fase1-financeiro.md, seção 5). Os casos aqui
 * são os que fazem dois números da mesma tela discordarem quando calculados
 * "no olho": gasto planejado que ainda não virou contrato, parcelamento
 * incompleto, piso somado na ordem errada, e a divergência deliberada entre o
 * valor do contrato e suas parcelas.
 */

const HOJE = '2026-09-10'

function parcela(vence_em: string, valor_centavos: number, pago_em: string | null = null) {
  return { vence_em, valor_centavos, pago_em }
}

/** Gasto ainda no planejamento: tem estimativa, não tem contrato. */
function planejado(estimado: number): DespesaCalculavel {
  return { valor_estimado_centavos: estimado, valor_centavos: null, parcelas: [] }
}

function contratado(
  estimado: number | null,
  final: number,
  parcelas: DespesaCalculavel['parcelas'] = [],
): DespesaCalculavel {
  return { valor_estimado_centavos: estimado, valor_centavos: final, parcelas }
}

function grupo(
  nome: string,
  orcado: number,
  despesas: DespesaCalculavel[],
  categoriaId: string | null = nome,
): GrupoDeCategoria {
  return { categoriaId, nome, valorPrevistoCentavos: orcado, despesas }
}

describe('situacaoDaParcela', () => {
  it('parcela com pago_em está paga, mesmo vencida há meses', () => {
    expect(situacaoDaParcela(parcela('2026-01-10', 5_000, '2026-01-09'), HOJE)).toBe('paga')
  })

  it('parcela que vence hoje ainda é a_vencer — o casal tem o dia todo', () => {
    expect(situacaoDaParcela(parcela(HOJE, 5_000), HOJE)).toBe('a_vencer')
  })

  it('parcela de ontem está vencida', () => {
    expect(situacaoDaParcela(parcela('2026-09-09', 5_000), HOJE)).toBe('vencida')
  })
})

describe('totaisDaDespesa — planejar e contratar são momentos diferentes', () => {
  it('gasto só planejado não tem contratado nem a pagar', () => {
    const totais = totaisDaDespesa(planejado(1_200_000))

    expect(totais.estimado).toBe(1_200_000)
    expect(totais.contratado).toBeNull()
    expect(totais.aPagar).toBe(0)
    expect(totais.estagio).toBe('planejado')
  })

  it('gasto contratado sem estimativa usa o próprio valor fechado como estimado', () => {
    const totais = totaisDaDespesa(contratado(null, 450_000))

    expect(totais.estimado).toBe(450_000)
    expect(totais.contratado).toBe(450_000)
    expect(totais.desvioDoEstimado).toBeNull()
  })

  it('mostra a economia (ou o excesso) contra o que se imaginava', () => {
    expect(totaisDaDespesa(contratado(1_200_000, 1_150_000)).desvioDoEstimado).toBe(-50_000)
    expect(totaisDaDespesa(contratado(1_200_000, 1_300_000)).desvioDoEstimado).toBe(100_000)
  })

  it('mantém a identidade aPagar = agendado + naoParcelado no parcelamento incompleto', () => {
    const totais = totaisDaDespesa(
      contratado(2_000_000, 2_000_000, [
        parcela('2026-03-10', 500_000, '2026-03-10'),
        parcela('2026-10-10', 900_000),
      ]),
    )

    expect(totais.pago).toBe(500_000)
    expect(totais.agendado).toBe(900_000)
    expect(totais.aPagar).toBe(1_500_000)
    expect(totais.naoParcelado).toBe(600_000)
    expect(totais.aPagar).toBe(totais.agendado + totais.naoParcelado)
  })

  it('fica quitado quando as parcelas cobrem o contrato', () => {
    const totais = totaisDaDespesa(
      contratado(500_000, 500_000, [parcela('2026-03-10', 500_000, '2026-03-10')]),
    )

    expect(totais.aPagar).toBe(0)
    expect(totais.estagio).toBe('quitado')
  })

  it('parcelas acima do valor viram aviso, nunca naoParcelado negativo', () => {
    const totais = totaisDaDespesa(
      contratado(1_000_000, 1_000_000, [
        parcela('2026-03-10', 300_000, '2026-03-10'),
        parcela('2026-04-10', 900_000),
      ]),
    )

    expect(totais.naoParcelado).toBe(0)
    expect(totais.parcelasAlemDoValor).toBe(200_000)
    // A fórmula continua contratual: final - pago, não a soma das parcelas.
    expect(totais.aPagar).toBe(700_000)
  })

  it('pago acima do contrato zera o a pagar e sinaliza o excedente', () => {
    const totais = totaisDaDespesa(
      contratado(500_000, 500_000, [parcela('2026-03-10', 600_000, '2026-03-10')]),
    )

    expect(totais.aPagar).toBe(0)
    expect(totais.pagoAlemDoValor).toBe(100_000)
  })
})

describe('percentual', () => {
  it('devolve null quando não há base — nunca 0%', () => {
    expect(percentual(0, 0)).toBeNull()
    expect(percentual(1_000, 0)).toBeNull()
  })

  it('arredonda para inteiro', () => {
    expect(percentual(3_345_000, 5_400_000)).toBe(62)
  })
})

describe('linhaDeCategoria', () => {
  it('separa o teto, o estimado e o contratado', () => {
    const linha = linhaDeCategoria(
      grupo('Recepção', 1_500_000, [planejado(420_000), contratado(1_200_000, 1_150_000)]),
    )

    expect(linha.orcado).toBe(1_500_000)
    expect(linha.estimado).toBe(1_620_000)
    expect(linha.contratado).toBe(1_150_000)
    expect(linha.acimaDoOrcado).toBe(120_000)
    expect(linha.aContratar).toBe(470_000)
    expect(linha.gastosPlanejados).toBe(1)
  })

  it('teto maior que o estimado vira "ainda a planejar"', () => {
    const linha = linhaDeCategoria(grupo('Música', 600_000, [planejado(200_000)]))

    expect(linha.aPlanejar).toBe(400_000)
    expect(linha.acimaDoOrcado).toBe(0)
  })

  it('categoria sem teto nunca acusa estouro', () => {
    const linha = linhaDeCategoria(grupo('Sem categoria', 0, [contratado(null, 45_000)], null))

    expect(linha.acimaDoOrcado).toBe(0)
    expect(linha.contratado).toBe(45_000)
  })
})

describe('resumoDoOrcamento', () => {
  const grupos: GrupoDeCategoria[] = [
    grupo('Espaço', 1_500_000, [
      contratado(1_500_000, 1_500_000, [
        parcela('2026-08-10', 500_000, '2026-08-10'),
        parcela('2026-09-25', 1_000_000),
      ]),
    ]),
    grupo('Buffet', 2_000_000, [
      contratado(2_000_000, 2_200_000, [
        parcela('2026-09-01', 200_000),
        parcela('2026-12-01', 500_000),
      ]),
    ]),
    grupo('Música', 600_000, [planejado(620_000)]),
  ]

  const resumo = resumoDoOrcamento(grupos, { hoje: HOJE, tetoCentavos: 10_000_000 })

  it('soma os estágios sem misturar planejado com contratado', () => {
    expect(resumo.orcado).toBe(4_100_000)
    expect(resumo.estimado).toBe(4_120_000)
    expect(resumo.contratado).toBe(3_700_000)
    expect(resumo.pago).toBe(500_000)
    expect(resumo.aPagar).toBe(3_200_000)
  })

  it('o que falta contratar considera só o que foi planejado', () => {
    // Buffet fechou acima do estimado (0 a contratar) e Música nem começou.
    expect(resumo.aContratar).toBe(620_000)
  })

  it('estouro é do planejamento contra o teto, por categoria', () => {
    // Buffet estimou 20k dentro de 20k; Música estimou 6.200 num teto de 6.000.
    expect(resumo.atencao.acimaDoOrcado).toEqual({ valor: 20_000, quantidade: 1 })
  })

  it('separa vencidos de próximos 30 dias, com valor e quantidade', () => {
    expect(resumo.atencao.vencidos).toEqual({ valor: 200_000, quantidade: 1 })
    expect(resumo.atencao.proximos30Dias).toEqual({ valor: 1_000_000, quantidade: 1 })
  })

  it('compara o teto com o orçado, sem derivar um do outro', () => {
    expect(resumo.naoDistribuido).toBe(5_900_000)
  })

  it('sem teto definido, naoDistribuido é null', () => {
    const semTeto = resumoDoOrcamento(grupos, { hoje: HOJE, tetoCentavos: null })

    expect(semTeto.naoDistribuido).toBeNull()
  })

  it('sem nada planejado, os indicadores de planejamento somem em vez de mentir', () => {
    const semPlanejamento = resumoDoOrcamento(
      [grupo('Sem categoria', 0, [contratado(null, 45_000)], null)],
      { hoje: HOJE, tetoCentavos: null },
    )

    expect(semPlanejamento.atencao.acimaDoOrcado.quantidade).toBe(0)
    expect(semPlanejamento.aPlanejar).toBe(0)
  })

  it('parcela fora do horizonte não entra no bloco de atenção', () => {
    const limite = somarDias(HOJE, DIAS_HORIZONTE_VENCIMENTO)
    const depois = somarDias(limite, 1)
    const comFuturo = resumoDoOrcamento(
      [grupo('Bolo', 0, [contratado(100_000, 100_000, [parcela(depois, 100_000)])])],
      { hoje: HOJE, tetoCentavos: null },
    )

    expect(comFuturo.atencao.proximos30Dias.quantidade).toBe(0)
  })
})

describe('situacaoFinanceiraFornecedor', () => {
  it('sem despesa ligada, é sem_despesa — e não "quitado"', () => {
    expect(situacaoFinanceiraFornecedor([])).toBe('sem_despesa')
  })

  it('quitado quando todas as despesas estão pagas', () => {
    expect(
      situacaoFinanceiraFornecedor([
        contratado(100_000, 100_000, [parcela('2026-01-10', 100_000, '2026-01-10')]),
      ]),
    ).toBe('quitado')
  })

  it('a_pagar quando sobra saldo, mesmo sem parcela cadastrada', () => {
    expect(situacaoFinanceiraFornecedor([contratado(100_000, 100_000)])).toBe('a_pagar')
  })

  it('gasto só planejado não deixa o fornecedor "a pagar" — não há compromisso ainda', () => {
    expect(situacaoFinanceiraFornecedor([planejado(100_000)])).toBe('quitado')
  })
})

describe('gerarParcelas', () => {
  it('divide em N vencendo no mesmo dia de cada mês', () => {
    const parcelas = gerarParcelas(900_000, 3, '2026-10-10')

    expect(parcelas.map((p) => p.vence_em)).toEqual(['2026-10-10', '2026-11-10', '2026-12-10'])
    expect(parcelas.map((p) => p.valor_centavos)).toEqual([300_000, 300_000, 300_000])
  })

  it('vira o ano sem perder o dia', () => {
    expect(gerarParcelas(200_000, 2, '2026-12-05').map((p) => p.vence_em)).toEqual([
      '2026-12-05',
      '2027-01-05',
    ])
  })

  it('dia 31 cai no último dia de mês curto, nunca vaza para o mês seguinte', () => {
    expect(gerarParcelas(300_000, 3, '2027-01-31').map((p) => p.vence_em)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
    ])
  })

  it('a sobra de centavos vai na primeira parcela e o total fecha', () => {
    const parcelas = gerarParcelas(100_000, 3, '2026-10-10')

    expect(parcelas.map((p) => p.valor_centavos)).toEqual([33_334, 33_333, 33_333])
    expect(parcelas.reduce((total, p) => total + p.valor_centavos, 0)).toBe(100_000)
  })
})

describe('hojeNoFusoDoEvento', () => {
  it('usa o dia de quem casa, não o do servidor em UTC', () => {
    // 22h de 10/09 em São Paulo já é 01h de 11/09 em UTC.
    const noite = new Date('2026-09-11T01:00:00Z')

    expect(hojeNoFusoDoEvento(noite)).toBe('2026-09-10')
  })
})

describe('somarDias', () => {
  it('atravessa a virada do mês', () => {
    expect(somarDias('2026-09-10', 30)).toBe('2026-10-10')
  })
})

describe('resumoDeCotacoes', () => {
  it('soma a MENOR proposta de cada gasto, nunca todas elas', () => {
    // Três fornecedores do mesmo refrigerante não são três compras — somar as
    // três descreveria um casamento que ninguém vai fazer.
    const resumo = resumoDeCotacoes([
      { estimado: 180_000, contratado: null, cotacoes: [162_000, 175_000, 198_000] },
    ])

    expect(resumo.emCotacao).toBe(162_000)
    expect(resumo.gastosEmCotacao).toBe(1)
  })

  it('gasto fechado sai da cotação e entra no contratado', () => {
    const resumo = resumoDeCotacoes([
      { estimado: 2_400_000, contratado: 2_300_000, cotacoes: [2_300_000, 2_800_000] },
      { estimado: 180_000, contratado: null, cotacoes: [162_000] },
    ])

    expect(resumo.contratado).toBe(2_300_000)
    expect(resumo.emCotacao).toBe(162_000)
    expect(resumo.gastosEmCotacao).toBe(1)
  })

  it('conta como "sem fornecedor" só o que está em aberto e sem proposta', () => {
    const resumo = resumoDeCotacoes([
      // Planejado e ninguém cotou ainda: é o que a tela pede.
      { estimado: 950_000, contratado: null, cotacoes: [] },
      // Contratado direto no Orçamento, sem passar por cotação: não espera ninguém.
      { estimado: 250_000, contratado: 240_000, cotacoes: [] },
    ])

    expect(resumo.gastosSemFornecedor).toBe(1)
  })

  it('proposta zerada não conta como proposta', () => {
    const resumo = resumoDeCotacoes([{ estimado: 100_000, contratado: null, cotacoes: [0] }])

    expect(resumo.emCotacao).toBe(0)
    expect(resumo.gastosSemFornecedor).toBe(1)
  })

  it('o estimado soma tudo, contratado ou não', () => {
    const resumo = resumoDeCotacoes([
      { estimado: 100_000, contratado: 90_000, cotacoes: [] },
      { estimado: 200_000, contratado: null, cotacoes: [] },
    ])

    expect(resumo.estimado).toBe(300_000)
  })

  it('sem gasto nenhum, devolve tudo zerado em vez de NaN', () => {
    expect(resumoDeCotacoes([])).toEqual({
      estimado: 0,
      emCotacao: 0,
      contratado: 0,
      gastosEmCotacao: 0,
      gastosSemFornecedor: 0,
    })
  })
})
