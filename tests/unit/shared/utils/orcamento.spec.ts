import { describe, expect, it } from 'vitest'
import {
  DIAS_HORIZONTE_VENCIMENTO,
  gerarParcelas,
  hojeNoFusoDoEvento,
  linhaDeCategoria,
  percentual,
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
 * "no olho": parcelamento incompleto, piso somado na ordem errada, e a
 * divergência deliberada entre o valor da despesa e suas parcelas.
 */

const HOJE = '2026-09-10'

function parcela(vence_em: string, valor_centavos: number, pago_em: string | null = null) {
  return { vence_em, valor_centavos, pago_em }
}

function grupo(
  nome: string,
  valorPrevistoCentavos: number,
  despesas: DespesaCalculavel[],
  categoriaId: string | null = nome,
): GrupoDeCategoria {
  return { categoriaId, nome, valorPrevistoCentavos, despesas }
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

describe('totaisDaDespesa', () => {
  it('mantém a identidade aPagar = agendado + naoParcelado no parcelamento incompleto', () => {
    const totais = totaisDaDespesa({
      valor_centavos: 2_000_000,
      parcelas: [parcela('2026-03-10', 500_000, '2026-03-10'), parcela('2026-10-10', 900_000)],
    })

    expect(totais.pago).toBe(500_000)
    expect(totais.agendado).toBe(900_000)
    expect(totais.aPagar).toBe(1_500_000)
    expect(totais.naoParcelado).toBe(600_000)
    expect(totais.aPagar).toBe(totais.agendado + totais.naoParcelado)
  })

  it('despesa sem nenhuma parcela tem tudo a pagar e nada agendado', () => {
    const totais = totaisDaDespesa({ valor_centavos: 800_000, parcelas: [] })

    expect(totais).toMatchObject({ pago: 0, agendado: 0, aPagar: 800_000, naoParcelado: 800_000 })
  })

  it('parcelas acima do valor da despesa viram aviso, nunca naoParcelado negativo', () => {
    const totais = totaisDaDespesa({
      valor_centavos: 1_000_000,
      parcelas: [parcela('2026-03-10', 300_000, '2026-03-10'), parcela('2026-04-10', 900_000)],
    })

    expect(totais.naoParcelado).toBe(0)
    expect(totais.parcelasAlemDoValor).toBe(200_000)
    // A fórmula continua contratual: valor - pago, não a soma das parcelas em aberto.
    expect(totais.aPagar).toBe(700_000)
  })

  it('pago acima do valor da despesa zera o a pagar e sinaliza o excedente', () => {
    const totais = totaisDaDespesa({
      valor_centavos: 500_000,
      parcelas: [parcela('2026-03-10', 600_000, '2026-03-10')],
    })

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
  it('separa a contratar de acima do planejado — nunca o mesmo número com sinal', () => {
    const folgada = linhaDeCategoria(grupo('Música', 600_000, []))
    const estourada = linhaDeCategoria(
      grupo('Buffet', 2_000_000, [{ valor_centavos: 2_200_000, parcelas: [] }]),
    )

    expect(folgada.aContratar).toBe(600_000)
    expect(folgada.acimaDoPlanejado).toBe(0)
    expect(estourada.aContratar).toBe(0)
    expect(estourada.acimaDoPlanejado).toBe(200_000)
  })

  it('sem previsto definido, o percentual é null em vez de 0%', () => {
    const linha = linhaDeCategoria(
      grupo('Sem categoria', 0, [{ valor_centavos: 45_000, parcelas: [] }], null),
    )

    expect(linha.percentualContratado).toBeNull()
    expect(linha.contratado).toBe(45_000)
  })
})

describe('resumoDoOrcamento', () => {
  const grupos: GrupoDeCategoria[] = [
    grupo('Espaço', 1_500_000, [
      {
        valor_centavos: 1_500_000,
        parcelas: [parcela('2026-08-10', 500_000, '2026-08-10'), parcela('2026-09-25', 1_000_000)],
      },
    ]),
    grupo('Buffet', 2_000_000, [
      {
        valor_centavos: 2_200_000,
        parcelas: [parcela('2026-09-01', 200_000), parcela('2026-12-01', 500_000)],
      },
    ]),
    grupo('Música', 600_000, []),
  ]

  const resumo = resumoDoOrcamento(grupos, { hoje: HOJE, tetoCentavos: 10_000_000 })

  it('soma os quatro estágios', () => {
    expect(resumo.planejado).toBe(4_100_000)
    expect(resumo.contratado).toBe(3_700_000)
    expect(resumo.pago).toBe(500_000)
    expect(resumo.aPagar).toBe(3_200_000)
  })

  it('soma os pisos por categoria, não a diferença dos totais', () => {
    // Espaço fecha (0), Buffet estourou (0, não -200k) e Música falta inteira.
    expect(resumo.aContratar).toBe(600_000)
    expect(resumo.atencao.acimaDoPlanejado).toEqual({ valor: 200_000, quantidade: 1 })
  })

  it('separa vencidos de próximos 30 dias, com valor e quantidade', () => {
    expect(resumo.atencao.vencidos).toEqual({ valor: 200_000, quantidade: 1 })
    expect(resumo.atencao.proximos30Dias).toEqual({ valor: 1_000_000, quantidade: 1 })
  })

  it('compara o teto com o planejado, sem derivar um do outro', () => {
    expect(resumo.naoDistribuido).toBe(5_900_000)
  })

  it('sem teto definido, naoDistribuido é null', () => {
    const semTeto = resumoDoOrcamento(grupos, { hoje: HOJE, tetoCentavos: null })

    expect(semTeto.naoDistribuido).toBeNull()
    expect(semTeto.planejado).toBe(4_100_000)
  })

  it('sem nada planejado, os indicadores de planejamento somem em vez de mentir', () => {
    const semPlanejamento = resumoDoOrcamento(
      [grupo('Sem categoria', 0, [{ valor_centavos: 45_000, parcelas: [] }], null)],
      { hoje: HOJE, tetoCentavos: null },
    )

    expect(semPlanejamento.percentualContratado).toBeNull()
    expect(semPlanejamento.aContratar).toBe(0)
    expect(semPlanejamento.atencao.acimaDoPlanejado.quantidade).toBe(0)
  })

  it('parcela fora do horizonte não entra no bloco de atenção', () => {
    const limite = somarDias(HOJE, DIAS_HORIZONTE_VENCIMENTO)
    const depois = somarDias(limite, 1)
    const resumoComFuturo = resumoDoOrcamento(
      [grupo('Bolo', 0, [{ valor_centavos: 100_000, parcelas: [parcela(depois, 100_000)] }])],
      { hoje: HOJE, tetoCentavos: null },
    )

    expect(resumoComFuturo.atencao.proximos30Dias.quantidade).toBe(0)
  })
})

describe('situacaoFinanceiraFornecedor', () => {
  it('sem despesa ligada, é sem_despesa — e não "quitado"', () => {
    expect(situacaoFinanceiraFornecedor([])).toBe('sem_despesa')
  })

  it('quitado quando todas as despesas estão pagas', () => {
    expect(
      situacaoFinanceiraFornecedor([
        { valor_centavos: 100_000, parcelas: [parcela('2026-01-10', 100_000, '2026-01-10')] },
      ]),
    ).toBe('quitado')
  })

  it('a_pagar quando sobra saldo, mesmo sem parcela cadastrada', () => {
    expect(situacaoFinanceiraFornecedor([{ valor_centavos: 100_000, parcelas: [] }])).toBe(
      'a_pagar',
    )
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
