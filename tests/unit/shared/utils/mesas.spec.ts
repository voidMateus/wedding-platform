import { describe, expect, it } from 'vitest'
import {
  areaDaPlanta,
  limitarNaArea,
  resumoDaMesa,
  resumoDoSalao,
  type OcupanteParaCalculo,
} from '#shared/utils/mesas'

const MESA_8 = { id: 'm1', capacidade: 8 }

function ocupante(
  id: string,
  mesaId: string | null,
  statusRsvp: OcupanteParaCalculo['statusRsvp'] = 'pendente',
): OcupanteParaCalculo {
  return { id, mesaId, statusRsvp }
}

describe('resumoDaMesa', () => {
  it('mesa vazia: nenhuma ocupação, todos os lugares livres', () => {
    expect(resumoDaMesa(MESA_8, [])).toEqual({ ocupacao: 0, livres: 8, excedente: 0, naoVao: 0 })
  })

  it('mesa cheia: zero livres, zero excedente', () => {
    const pessoas = Array.from({ length: 8 }, (_, i) => ocupante(`g${i}`, 'm1'))

    expect(resumoDaMesa(MESA_8, pessoas)).toMatchObject({ ocupacao: 8, livres: 0, excedente: 0 })
  })

  // Estado real do planejamento ("depois eu resolvo"), nunca bloqueado.
  it('acima da capacidade: excedente positivo e livres em zero, nunca negativo', () => {
    const pessoas = Array.from({ length: 10 }, (_, i) => ocupante(`g${i}`, 'm1'))

    expect(resumoDaMesa(MESA_8, pessoas)).toMatchObject({ ocupacao: 10, livres: 0, excedente: 2 })
  })

  it('ignora quem está em outra mesa ou sem mesa', () => {
    const pessoas = [ocupante('a', 'm1'), ocupante('b', 'm2'), ocupante('c', null)]

    expect(resumoDaMesa(MESA_8, pessoas).ocupacao).toBe(1)
  })

  // Quem recusou CONTINUA sentado: retirar sozinho apagaria trabalho do casal
  // por causa de uma resposta que ainda pode mudar.
  it('quem recusou conta na ocupação e é sinalizado à parte', () => {
    const pessoas = [
      ocupante('a', 'm1', 'confirmado'),
      ocupante('b', 'm1', 'recusado'),
      ocupante('c', 'm1', 'recusado'),
    ]

    expect(resumoDaMesa(MESA_8, pessoas)).toMatchObject({ ocupacao: 3, naoVao: 2 })
  })

  // O avulso só existe porque alguém já confirmou por ele — e ocupa lugar.
  it('acompanhante avulso (sem status) ocupa lugar', () => {
    expect(resumoDaMesa(MESA_8, [ocupante('avulso', 'm1', null)]).ocupacao).toBe(1)
  })
})

describe('resumoDoSalao', () => {
  const mesas = [
    { id: 'm1', capacidade: 8 },
    { id: 'm2', capacidade: 4 },
  ]

  it('soma capacidade, sentados e livres', () => {
    const pessoas = [ocupante('a', 'm1'), ocupante('b', 'm1'), ocupante('c', 'm2')]

    expect(resumoDoSalao(mesas, pessoas)).toMatchObject({
      totalMesas: 2,
      capacidadeTotal: 12,
      sentados: 3,
      livres: 9,
    })
  })

  // A regra que o Financeiro ensinou: piso por linha ANTES de somar. Com uma
  // mesa sobrando 2 lugares e outra com 2 a mais, somar primeiro daria "0
  // livres, nada demais" e apagaria as duas anomalias.
  it('piso em zero é por mesa, não sobre o total', () => {
    const pessoas = [
      ...Array.from({ length: 6 }, (_, i) => ocupante(`a${i}`, 'm1')),
      ...Array.from({ length: 6 }, (_, i) => ocupante(`b${i}`, 'm2')),
    ]

    const resumo = resumoDoSalao(mesas, pessoas)
    expect(resumo.livres).toBe(2)
    expect(resumo.mesasAcimaDaCapacidade).toBe(1)
  })

  it('falta acomodar conta só quem não recusou', () => {
    const pessoas = [
      ocupante('sentado', 'm1', 'confirmado'),
      ocupante('sem-mesa', null, 'confirmado'),
      ocupante('pendente-sem-mesa', null, 'pendente'),
      ocupante('recusou-sem-mesa', null, 'recusado'),
    ]

    expect(resumoDoSalao(mesas, pessoas).faltaAcomodar).toBe(2)
  })

  it('salão sem mesa nenhuma não quebra', () => {
    expect(resumoDoSalao([], [ocupante('a', null)])).toMatchObject({
      totalMesas: 0,
      capacidadeTotal: 0,
      livres: 0,
      faltaAcomodar: 1,
    })
  })
})

describe('areaDaPlanta', () => {
  it('usa as medidas do salão quando existem', () => {
    expect(areaDaPlanta({ larguraCm: 2000, profundidadeCm: 1500 }, [])).toEqual({
      larguraCm: 2000,
      profundidadeCm: 1500,
      definida: true,
    })
  })

  // Nulo é estado válido: a planta funciona no primeiro dia, antes de o casal
  // saber quanto mede o salão.
  it('sem medidas, começa num mínimo utilizável', () => {
    expect(areaDaPlanta({ larguraCm: null, profundidadeCm: null }, [])).toMatchObject({
      larguraCm: 1000,
      profundidadeCm: 800,
      definida: false,
    })
  })

  it('sem medidas, cresce para caber a peça mais distante', () => {
    const area = areaDaPlanta({ larguraCm: null, profundidadeCm: null }, [
      { posicaoXCm: 1500, posicaoYCm: 100, larguraCm: 180, profundidadeCm: 180 },
    ])

    expect(area.larguraCm).toBe(1880)
    expect(area.definida).toBe(false)
  })

  // Medida pela metade não é medida: uma largura sem profundidade deixaria a
  // planta com um eixo real e outro inventado.
  it('só uma das medidas não conta como definida', () => {
    expect(areaDaPlanta({ larguraCm: 2000, profundidadeCm: null }, []).definida).toBe(false)
  })
})

describe('limitarNaArea', () => {
  const area = { larguraCm: 1000, profundidadeCm: 800 }
  const mesa = { larguraCm: 180, profundidadeCm: 180 }

  it('deixa passar posição que cabe', () => {
    expect(limitarNaArea({ x: 300, y: 200 }, mesa, area)).toEqual({ x: 300, y: 200 })
  })

  // Coordenada negativa não existe — o CHECK do banco recusa.
  it('prende no zero', () => {
    expect(limitarNaArea({ x: -50, y: -10 }, mesa, area)).toEqual({ x: 0, y: 0 })
  })

  // Deixar sair pela direita esconderia a mesa atrás da borda, com o casal
  // achando que ela sumiu.
  it('prende na borda oposta, descontando o tamanho da peça', () => {
    expect(limitarNaArea({ x: 9999, y: 9999 }, mesa, area)).toEqual({ x: 820, y: 620 })
  })

  it('arredonda: centímetro é inteiro no banco', () => {
    expect(limitarNaArea({ x: 10.7, y: 20.2 }, mesa, area)).toEqual({ x: 11, y: 20 })
  })

  // Peça maior que a área (salão apertado declarado depois das mesas): o
  // limite superior fica negativo e o piso em zero é o que impede a peça de
  // ser jogada para fora por um cálculo.
  it('peça maior que a área fica no canto, nunca em posição negativa', () => {
    expect(
      limitarNaArea({ x: 500, y: 500 }, { larguraCm: 2000, profundidadeCm: 2000 }, area),
    ).toEqual({ x: 0, y: 0 })
  })
})
