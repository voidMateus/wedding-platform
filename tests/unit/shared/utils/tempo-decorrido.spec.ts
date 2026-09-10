import { describe, expect, it } from 'vitest'
import { formatarTempoDecorrido } from '#shared/utils/format-date'

/**
 * O tempo no estágio do convite. `agora` é sempre explícito aqui: teste de
 * formatação de data que depende do relógio da máquina falha sozinho num
 * feriado qualquer.
 */
const AGORA = new Date('2026-09-10T12:00:00.000Z')

function decorrido(iso: string | null | undefined): string | null {
  return formatarTempoDecorrido(iso, AGORA)
}

describe('formatarTempoDecorrido', () => {
  it('conta dias corridos, não dias de calendário', () => {
    // A pergunta é "quanto tempo faz", e para isso 23h de ontem e 1h de hoje
    // são a mesma coisa — 20 horas atrás continua sendo "hoje".
    expect(decorrido('2026-09-09T16:00:00.000Z')).toBe('hoje')
    expect(decorrido('2026-09-09T11:00:00.000Z')).toBe('há 1 dia')
  })

  it('usa singular no dia, e nunca em mês', () => {
    expect(decorrido('2026-09-09T11:00:00.000Z')).toBe('há 1 dia')
    // Com o corte em 60 dias, o primeiro balde de mês já é 2 — "há 1 mês" é
    // inalcançável por construção, e o código não finge tratá-lo.
    expect(decorrido('2026-07-10T12:00:00.000Z')).toBe('há 2 meses')
    expect(decorrido('2026-07-12T12:00:00.000Z')).toBe('há 2 meses')
    expect(decorrido('2026-01-10T12:00:00.000Z')).toBe('há 8 meses')
  })

  it('mantém a contagem em dias até 60, onde ainda é informação útil', () => {
    expect(decorrido('2026-08-27T12:00:00.000Z')).toBe('há 14 dias')
    expect(decorrido('2026-07-27T12:00:00.000Z')).toBe('há 45 dias')
    // "há 45 dias" diz mais que "há 1 mês"; a virada só compensa quando o
    // número de dias deixa de ser legível de relance.
    expect(decorrido('2026-07-12T12:00:00.000Z')).toBe('há 2 meses')
  })

  it('nunca olha para frente: data no futuro é dado inconsistente, não previsão', () => {
    expect(decorrido('2026-09-20T12:00:00.000Z')).toBe('hoje')
  })

  it('devolve null quando não há fato para datar', () => {
    // É o caso de `not_sent`: nada aconteceu, e a tela não mostra tempo.
    expect(decorrido(null)).toBeNull()
    expect(decorrido(undefined)).toBeNull()
    expect(decorrido('')).toBeNull()
    expect(decorrido('nao-e-data')).toBeNull()
  })
})
