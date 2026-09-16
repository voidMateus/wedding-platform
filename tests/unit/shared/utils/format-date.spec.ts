import { describe, expect, it } from 'vitest'
import { formatDatePtBR, formatDateTimePtBR } from '#shared/utils/format-date'

// Formato exato (dd/mm/aaaa, hh:mm) depende do timezone de quem roda o
// teste — verificamos a forma (regex), não o valor exato, pra não ficar
// frágil em CI rodando em outro fuso.

describe('formatDateTimePtBR', () => {
  it('retorna travessão para null', () => {
    expect(formatDateTimePtBR(null)).toBe('—')
  })

  it('formata data e hora no padrão pt-BR', () => {
    expect(formatDateTimePtBR('2026-08-20T13:55:00.000Z')).toMatch(
      /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/,
    )
  })
})

describe('formatDatePtBR', () => {
  it('retorna travessão para null', () => {
    expect(formatDatePtBR(null)).toBe('—')
  })

  it('formata só a data no padrão pt-BR', () => {
    expect(formatDatePtBR('2026-08-20T13:55:00.000Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  /**
   * Aqui o valor EXATO importa, e não depende do fuso de quem roda: data sem
   * hora é local por definição. O teste acima, que só confere a forma, deixou
   * passar um deslocamento de um dia — `new Date('2026-08-20')` é meia-noite
   * UTC, e em qualquer fuso negativo isso é 19/08.
   */
  it('não volta um dia em data sem hora', () => {
    expect(formatDatePtBR('2026-08-20')).toBe('20/08/2026')
    expect(formatDatePtBR('2027-01-01')).toBe('01/01/2027')
  })
})
