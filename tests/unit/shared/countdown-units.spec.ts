import { describe, expect, it } from 'vitest'
import {
  COUNTDOWN_UNIT_IDS,
  DEFAULT_COUNTDOWN_UNITS,
  computeCountdownParts,
  resolveCountdownUnits,
} from '#shared/countdown-units'

describe('resolveCountdownUnits', () => {
  it('cai no padrão de sempre quando não há seleção salva', () => {
    expect(resolveCountdownUnits(undefined)).toEqual(DEFAULT_COUNTDOWN_UNITS)
    expect(resolveCountdownUnits([])).toEqual(DEFAULT_COUNTDOWN_UNITS)
  })

  it('costura o vão entre a maior e a menor unidade marcadas', () => {
    // "meses e horas" sem dias apagaria o dia que falta da conta.
    expect(resolveCountdownUnits(['meses', 'horas'])).toEqual(['meses', 'dias', 'horas'])
  })

  it('não força a semana entre meses e dias — "2 meses e 12 dias" é leitura corrente', () => {
    expect(resolveCountdownUnits(['meses', 'dias'])).toEqual(['meses', 'dias'])
    expect(resolveCountdownUnits(['meses', 'minutos'])).toEqual([
      'meses',
      'dias',
      'horas',
      'minutos',
    ])
  })

  it('inclui a semana quando ela é escolhida', () => {
    expect(resolveCountdownUnits(['meses', 'semanas', 'dias'])).toEqual([
      'meses',
      'semanas',
      'dias',
    ])
  })

  it('costura o dia entre semanas e horas (só a semana é pulável)', () => {
    expect(resolveCountdownUnits(['semanas', 'horas'])).toEqual(['semanas', 'dias', 'horas'])
  })

  it('ordena da maior para a menor, sem depender da ordem em que foi salva', () => {
    expect(resolveCountdownUnits(['horas', 'meses', 'dias'])).toEqual(['meses', 'dias', 'horas'])
  })

  it('ignora repetição e id fora do catálogo', () => {
    expect(resolveCountdownUnits(['dias', 'dias', 'luas'])).toEqual(['dias'])
  })

  it('cai no padrão quando a seleção inteira é desconhecida', () => {
    expect(resolveCountdownUnits(['luas', 'eras'])).toEqual(DEFAULT_COUNTDOWN_UNITS)
  })

  it('aceita uma unidade só', () => {
    expect(resolveCountdownUnits(['dias'])).toEqual(['dias'])
  })

  it('aceita o catálogo inteiro', () => {
    expect(resolveCountdownUnits([...COUNTDOWN_UNIT_IDS])).toEqual(COUNTDOWN_UNIT_IDS)
  })
})

describe('computeCountdownParts', () => {
  const valores = (parts: ReturnType<typeof computeCountdownParts>) =>
    parts.map((part) => [part.id, part.value])

  it('reparte o tempo restante entre as unidades escolhidas', () => {
    const from = new Date(2026, 0, 1, 10, 0, 0)
    const to = new Date(2026, 8, 3, 0, 0, 0) // 8 meses, 1 dia e 14 horas depois

    expect(valores(computeCountdownParts(['meses', 'dias', 'horas'], from, to))).toEqual([
      ['meses', 8],
      ['dias', 1],
      ['horas', 14],
    ])
  })

  it('conta meses pelo calendário, nunca como blocos de 30 dias', () => {
    const from = new Date(2026, 0, 1, 0, 0, 0)
    const to = new Date(2026, 2, 1, 0, 0, 0) // janeiro (31) + fevereiro (28)

    // Por "30 dias" daria 1 mês e 29 dias — pelo calendário são 2 meses redondos.
    expect(valores(computeCountdownParts(['meses', 'dias'], from, to))).toEqual([
      ['meses', 2],
      ['dias', 0],
    ])
  })

  it('preserva o fim do mês ao somar meses (31 de janeiro + 1 mês = 28 de fevereiro)', () => {
    const from = new Date(2026, 0, 31, 0, 0, 0)
    const to = new Date(2026, 1, 28, 0, 0, 0)

    expect(valores(computeCountdownParts(['meses', 'dias'], from, to))).toEqual([
      ['meses', 1],
      ['dias', 0],
    ])
  })

  it('não arredonda mês para cima: um dia a menos ainda é o mês anterior', () => {
    const from = new Date(2026, 0, 1, 0, 0, 0)
    const to = new Date(2026, 1, 28, 0, 0, 0) // 1 dia antes de fechar 2 meses

    expect(valores(computeCountdownParts(['meses', 'dias'], from, to))).toEqual([
      ['meses', 1],
      ['dias', 27],
    ])
  })

  it('a maior unidade acumula tudo que está acima dela', () => {
    const from = new Date(2026, 0, 1, 0, 0, 0)
    const to = new Date(2026, 8, 1, 0, 0, 0) // 243 dias

    expect(valores(computeCountdownParts(['dias'], from, to))).toEqual([['dias', 243]])
    expect(valores(computeCountdownParts(['horas'], from, to))).toEqual([['horas', 243 * 24]])
  })

  it('a menor unidade descarta o resto em vez de arredondar', () => {
    const from = new Date(2026, 0, 1, 0, 0, 0)
    const to = new Date(2026, 0, 3, 23, 59, 59)

    expect(valores(computeCountdownParts(['dias'], from, to))).toEqual([['dias', 2]])
  })

  it('costura a seleção antes de calcular (mesma faixa que o site mostra)', () => {
    const from = new Date(2026, 0, 1, 10, 0, 0)
    const to = new Date(2026, 8, 3, 0, 0, 0)

    expect(computeCountdownParts(['meses', 'horas'], from, to)).toEqual(
      computeCountdownParts(['meses', 'dias', 'horas'], from, to),
    )
  })

  it('conta semanas entre meses e dias', () => {
    const from = new Date(2026, 0, 1, 0, 0, 0)
    const to = new Date(2026, 0, 18, 0, 0, 0) // 17 dias = 2 semanas e 3 dias

    expect(valores(computeCountdownParts(['semanas', 'dias'], from, to))).toEqual([
      ['semanas', 2],
      ['dias', 3],
    ])
  })

  it('zera tudo quando a data-alvo já passou', () => {
    const from = new Date(2026, 5, 1, 0, 0, 0)
    const to = new Date(2026, 4, 1, 0, 0, 0)

    expect(valores(computeCountdownParts(['meses', 'dias', 'horas'], from, to))).toEqual([
      ['meses', 0],
      ['dias', 0],
      ['horas', 0],
    ])
  })

  it('concorda o rótulo com o número (1 dia, 2 dias)', () => {
    const from = new Date(2026, 0, 1, 0, 0, 0)

    expect(computeCountdownParts(['dias'], from, new Date(2026, 0, 2, 0, 0, 0))[0]?.label).toBe(
      'dia',
    )
    expect(computeCountdownParts(['dias'], from, new Date(2026, 0, 3, 0, 0, 0))[0]?.label).toBe(
      'dias',
    )
    expect(computeCountdownParts(['meses'], from, new Date(2026, 1, 1, 0, 0, 0))[0]?.label).toBe(
      'mês',
    )
  })
})
