import { describe, expect, it } from 'vitest'
import { diaLocal, instanteDoEnvio } from '#shared/utils/data-de-envio'

/**
 * O casal escolhe um DIA; a coluna guarda um timestamp. A conversão entre os
 * dois erra de um dia inteiro com facilidade, e o erro é mudo: o envio aparece
 * na véspera e o "faz quanto tempo" do funil sai errado para a lista inteira.
 */
describe('instante do envio', () => {
  // Componentes LOCAIS, nunca um instante com fuso fixo: `diaLocal` responde no
  // fuso de quem roda, então um `-03:00` aqui faria o teste afirmar coisas
  // diferentes em máquinas diferentes — foi assim que este arquivo reprovou uma
  // função correta no CI, que roda em UTC.
  const AGORA = new Date(2026, 8, 23, 15, 0)

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

  /**
   * Nunca `toISOString().slice(0, 10)`, que é UTC: à noite, ele já é amanhã.
   *
   * A data é montada por COMPONENTES LOCAIS, e não por um instante com fuso
   * fixo. A primeira versão deste teste fixava 23:30 em Brasília e esperava o
   * dia 23 — o que só é verdade em parte dos fusos: no CI, que roda em UTC,
   * esse mesmo instante já é dia 24, e o teste reprovou uma função correta.
   * Um teste que depende do relógio da máquina não afirma nada sobre o código.
   */
  it('o dia local é o de quem está olhando, não o de UTC', () => {
    const quaseMeiaNoite = new Date(2026, 8, 23, 23, 30)

    expect(diaLocal(quaseMeiaNoite)).toBe('2026-09-23')
  })
})
