import { describe, expect, it } from 'vitest'
import { diaLocal, instanteDoEnvio } from '#shared/utils/data-de-envio'

/**
 * O casal escolhe um DIA; a coluna guarda um timestamp. A conversão entre os
 * dois erra de um dia inteiro com facilidade, e o erro é mudo: o envio aparece
 * na véspera e o "faz quanto tempo" do funil sai errado para a lista inteira.
 */
describe('instante do envio', () => {
  const AGORA = new Date('2026-09-23T15:00:00-03:00')

  it('devolve meio-dia do dia escolhido', () => {
    const iso = instanteDoEnvio('2026-09-20', AGORA)

    expect(iso).toBeDefined()
    expect(new Date(iso!).getHours()).toBe(12)
  })

  /**
   * A armadilha que o meio-dia evita: `2026-09-20T00:00` em Brasília é o dia
   * 19 em UTC. Com meia-noite, o envio declarado no domingo apareceria no
   * sábado — e ninguém procuraria o defeito num fuso.
   */
  it('não escorrega para o dia anterior', () => {
    const iso = instanteDoEnvio('2026-09-20', AGORA)

    expect(new Date(iso!).getDate()).toBe(20)
    expect(new Date(iso!).getMonth()).toBe(8)
  })

  /**
   * Hoje é `undefined` de propósito: quem registra hoje está dizendo "agora", e
   * o `now()` do banco é mais preciso que um meio-dia inventado — que, às nove
   * da manhã, ainda seria futuro e o schema recusaria.
   */
  it('devolve indefinido para hoje e para o futuro', () => {
    expect(instanteDoEnvio('2026-09-23', AGORA)).toBeUndefined()
    expect(instanteDoEnvio('2026-09-24', AGORA)).toBeUndefined()
  })

  it('devolve indefinido sem data', () => {
    expect(instanteDoEnvio('', AGORA)).toBeUndefined()
  })

  /** Nunca `toISOString().slice(0, 10)`, que é UTC: à noite, ele já é amanhã. */
  it('o dia local é o de quem está olhando, não o de UTC', () => {
    const quaseMeiaNoiteEmBrasilia = new Date('2026-09-23T23:30:00-03:00')

    expect(diaLocal(quaseMeiaNoiteEmBrasilia)).toBe('2026-09-23')
  })
})
