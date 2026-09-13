import { describe, expect, it } from 'vitest'
import {
  conviteDeveReceberLembrete,
  diasAte,
  marcaQueDispara,
  proximaDataDeLembrete,
} from '#shared/utils/lembretes'

describe('diasAte', () => {
  it('conta dias inteiros entre duas datas', () => {
    expect(diasAte('2026-10-01', '2026-10-15')).toBe(14)
  })

  it('devolve negativo quando o alvo já passou', () => {
    expect(diasAte('2026-10-20', '2026-10-15')).toBe(-5)
  })

  it('atravessa a virada do horário de verão sem perder um dia', () => {
    // Em fusos com horário de verão, calcular isto com data local dá 6 ou 7
    // dias dependendo do dia — daí o cálculo ser em UTC.
    expect(diasAte('2026-02-12', '2026-02-19')).toBe(7)
    expect(diasAte('2026-10-15', '2026-10-22')).toBe(7)
  })

  it('devolve nulo para data inválida', () => {
    expect(diasAte('nunca', '2026-10-15')).toBeNull()
  })

  it('recusa TIMESTAMP no lugar de data — quem chama converte no fuso do evento antes', () => {
    // `casamentos.prazo_rsvp` é timestamptz. Passá-lo cru daria NaN, e o
    // sintoma seria silencioso: nenhum lembrete sairia e nada acusaria.
    expect(diasAte('2026-10-01', '2026-10-20T02:59:00+00:00')).toBeNull()
    expect(marcaQueDispara('2026-10-06', '2026-10-20T02:59:00+00:00', [14])).toBeNull()
  })
})

describe('marcaQueDispara', () => {
  const marcas = [14, 3]

  it('dispara no dia exato de uma marca', () => {
    expect(marcaQueDispara('2026-10-06', '2026-10-20', marcas)).toBe(14)
    expect(marcaQueDispara('2026-10-17', '2026-10-20', marcas)).toBe(3)
  })

  it('não dispara nos dias entre as marcas', () => {
    expect(marcaQueDispara('2026-10-07', '2026-10-20', marcas)).toBeNull()
    expect(marcaQueDispara('2026-10-16', '2026-10-20', marcas)).toBeNull()
  })

  it('não dispara depois que o alvo passou — lembrete não vira cobrança diária', () => {
    expect(marcaQueDispara('2026-10-21', '2026-10-20', [0, 3])).toBeNull()
  })

  it('dispara no próprio dia quando a marca é zero', () => {
    expect(marcaQueDispara('2026-10-20', '2026-10-20', [0])).toBe(0)
  })

  it('não dispara sem alvo — casamento sem prazo de RSVP não manda nada', () => {
    expect(marcaQueDispara('2026-10-06', null, marcas)).toBeNull()
    expect(marcaQueDispara('2026-10-06', undefined, marcas)).toBeNull()
  })

  it('não dispara com a lista de marcas vazia', () => {
    expect(marcaQueDispara('2026-10-06', '2026-10-20', [])).toBeNull()
  })
})

describe('proximaDataDeLembrete', () => {
  it('anuncia a próxima marca ainda não alcançada', () => {
    expect(proximaDataDeLembrete('2026-10-01', '2026-10-20', [14, 3])).toBe('2026-10-06')
  })

  it('pula a marca que já passou', () => {
    expect(proximaDataDeLembrete('2026-10-10', '2026-10-20', [14, 3])).toBe('2026-10-17')
  })

  it('devolve o próprio dia quando a marca é hoje', () => {
    expect(proximaDataDeLembrete('2026-10-06', '2026-10-20', [14, 3])).toBe('2026-10-06')
  })

  it('devolve nulo quando todas as marcas passaram', () => {
    expect(proximaDataDeLembrete('2026-10-19', '2026-10-20', [14, 3])).toBeNull()
  })

  it('devolve nulo sem alvo', () => {
    expect(proximaDataDeLembrete('2026-10-01', null, [14])).toBeNull()
  })
})

describe('conviteDeveReceberLembrete', () => {
  const base = {
    recebeuConvite: true,
    respondidoPorCompleto: false,
    temDestinatario: true,
    lembreteEnviadoHoje: false,
  }

  it('manda para quem recebeu o convite e não respondeu', () => {
    expect(conviteDeveReceberLembrete(base)).toBe(true)
  })

  it('não lembra quem nunca recebeu o convite', () => {
    expect(conviteDeveReceberLembrete({ ...base, recebeuConvite: false })).toBe(false)
  })

  it('não lembra quem já respondeu por inteiro', () => {
    expect(conviteDeveReceberLembrete({ ...base, respondidoPorCompleto: true })).toBe(false)
  })

  it('continua lembrando o convite que respondeu em parte', () => {
    // Falta gente dentro dele — é o caso que mais precisa do lembrete.
    expect(conviteDeveReceberLembrete({ ...base, respondidoPorCompleto: false })).toBe(true)
  })

  it('não lembra quem não tem para onde receber', () => {
    expect(conviteDeveReceberLembrete({ ...base, temDestinatario: false })).toBe(false)
  })

  it('não manda dois no mesmo dia', () => {
    expect(conviteDeveReceberLembrete({ ...base, lembreteEnviadoHoje: true })).toBe(false)
  })
})
