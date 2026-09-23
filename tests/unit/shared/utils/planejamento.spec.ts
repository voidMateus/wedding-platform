import { describe, expect, it } from 'vitest'
import {
  destaqueDoPlanejamento,
  diasAteOEvento,
  JANELAS,
  faseDoPrazo,
  janelaDaSugestao,
  janelaDaTarefa,
  prazoSugerido,
  resumoDoPlanejamento,
  rotuloDaContagem,
} from '#shared/utils/planejamento'
import type { TarefaSugerida } from '#shared/planejamento-tarefas'

const HOJE = '2026-09-13'
const EVENTO = '2027-06-12' // 272 dias depois de HOJE

function tarefa(prazo: string | null, concluida = false) {
  return { prazo, concluida_em: concluida ? '2026-09-10T12:00:00Z' : null }
}

describe('janelaDaTarefa', () => {
  it('concluída vence qualquer prazo — tarefa feita com atraso não é "vencida"', () => {
    // Continuar mostrando em vermelho o que já foi feito transformaria a
    // checklist num registro de culpa.
    expect(janelaDaTarefa(tarefa('2026-01-01', true), HOJE)).toBe('concluida')
  })

  it('sem prazo é estado próprio, nunca vencida', () => {
    expect(janelaDaTarefa(tarefa(null), HOJE)).toBe('sem_prazo')
  })

  it('ontem venceu; hoje ainda é desta semana', () => {
    expect(janelaDaTarefa(tarefa('2026-09-12'), HOJE)).toBe('vencida')
    expect(janelaDaTarefa(tarefa(HOJE), HOJE)).toBe('esta_semana')
  })

  it('a urgência vence a régua: 7 dias ainda é "desta semana"', () => {
    // Mesmo com data de evento, um prazo dentro de sete dias é urgência — quem
    // tem algo para amanhã não quer ler "9 meses antes" primeiro.
    expect(janelaDaTarefa(tarefa('2026-09-20'), HOJE, EVENTO)).toBe('esta_semana')
    expect(janelaDaTarefa(tarefa('2026-09-21'), HOJE, EVENTO)).toBe('nove_meses')
  })

  /**
   * A régua mudou no item D2: era a distância até HOJE ("Próximos 30 dias"),
   * virou a distância até o EVENTO ("6 meses antes") — que é como se fala de
   * casamento. O eixo continua sendo o tempo.
   */
  it('agrupa pela contagem regressiva do evento, não pela distância até hoje', () => {
    // 2027-06-12 é o evento. 180 dias antes = 2026-12-14.
    expect(janelaDaTarefa(tarefa('2026-12-14'), HOJE, EVENTO)).toBe('seis_meses')
    // Um dia mais cedo já pertence à faixa anterior.
    expect(janelaDaTarefa(tarefa('2026-12-13'), HOJE, EVENTO)).toBe('nove_meses')
  })

  it('sem data de evento, degrada para "mais adiante" em vez de inventar fase', () => {
    expect(janelaDaTarefa(tarefa('2026-09-21'), HOJE)).toBe('mais_adiante')
    expect(janelaDaTarefa(tarefa('2026-10-14'), HOJE)).toBe('mais_adiante')
  })
})

describe('a ordem das janelas', () => {
  /**
   * O que não tem data para se cobrar sozinho precisa estar à vista: embaixo de
   * dez faixas de meses, "sem prazo" e "de etapas que já passaram" ficam
   * invisíveis. Foi o que o uso mostrou em 22/09/2026.
   */
  it('põe o que pede decisão antes da contagem regressiva', () => {
    const posicao = (janela: string) => JANELAS.indexOf(janela as never)

    expect(posicao('ja_passou')).toBeLessThan(posicao('doze_meses'))
    expect(posicao('sem_prazo')).toBeLessThan(posicao('doze_meses'))
  })

  it('mas depois do prazo real perdido', () => {
    const posicao = (janela: string) => JANELAS.indexOf(janela as never)

    expect(posicao('vencida')).toBeLessThan(posicao('ja_passou'))
    expect(posicao('esta_semana')).toBeLessThan(posicao('ja_passou'))
  })

  it('e concluídas por último — histórico não disputa a primeira dobra', () => {
    expect(JANELAS.at(-1)).toBe('concluida')
  })
})

describe('faseDoPrazo', () => {
  it('cai na primeira fase que ainda comporta o prazo', () => {
    // 200 dias antes está entre 270 e 180: pertence à faixa de 9 meses.
    expect(faseDoPrazo('2026-11-24', EVENTO)).toBe('nove_meses')
  })

  it('prazo mais distante que a fase mais distante fica nela mesma', () => {
    // "Mais de um ano antes" não é um grupo útil.
    expect(faseDoPrazo('2020-01-01', EVENTO)).toBe('doze_meses')
  })

  it('prazo depois do evento vai para "Depois do casamento"', () => {
    expect(faseDoPrazo('2027-07-01', EVENTO)).toBe('depois')
  })

  it('o dia do evento pertence à semana dele', () => {
    expect(faseDoPrazo(EVENTO, EVENTO)).toBe('semana')
  })
})

describe('prazoSugerido', () => {
  it('conta para trás a partir da data do evento', () => {
    // 7 dias antes de 2027-06-12.
    expect(prazoSugerido('semana', EVENTO, HOJE)).toBe('2027-06-05')
  })

  it('fase "depois" cai DEPOIS do evento — o sinal negativo é o ponto', () => {
    expect(prazoSugerido('depois', EVENTO, HOJE)).toBe('2027-06-27')
  })

  it('fase que já passou não vira prazo: devolve null em vez de data vencida', () => {
    // 365 dias antes de um evento que está a 272 dias já passou. O casal que
    // descobre o produto tarde não ganha quinze linhas vermelhas de presente.
    expect(prazoSugerido('doze_meses', EVENTO, HOJE)).toBeNull()
  })

  it('sem data de evento não há prazo a propor', () => {
    expect(prazoSugerido('seis_meses', null, HOJE)).toBeNull()
  })
})

describe('janelaDaSugestao', () => {
  const sugestao = (fase: TarefaSugerida['fase']): TarefaSugerida => ({
    chave: 'x',
    titulo: 'X',
    fase,
  })

  it('cai na janela do próprio prazo sugerido — mesmo eixo das tarefas', () => {
    // E agora também com o mesmo RÓTULO: a sugestão da fase "depois" cai no
    // grupo "Depois do casamento", não num "Mais adiante" genérico.
    expect(janelaDaSugestao(sugestao('depois'), EVENTO, HOJE)).toBe('depois')
    expect(janelaDaSugestao(sugestao('seis_meses'), EVENTO, HOJE)).toBe('seis_meses')
  })

  it('fase já passada vai para o grupo de contexto, nunca para "vencida"', () => {
    expect(janelaDaSugestao(sugestao('doze_meses'), EVENTO, HOJE)).toBe('ja_passou')
  })

  it('sem data de evento, tudo é "algum dia"', () => {
    expect(janelaDaSugestao(sugestao('um_mes'), null, HOJE)).toBe('sem_prazo')
  })
})

describe('resumoDoPlanejamento', () => {
  it('conta cada tarefa uma vez, na janela dela', () => {
    const resumo = resumoDoPlanejamento(
      [tarefa('2026-09-01'), tarefa('2026-09-02'), tarefa(HOJE), tarefa('2027-01-01', true)],
      HOJE,
    )
    expect(resumo).toMatchObject({
      total: 4,
      vencidas: 2,
      estaSemana: 1,
      concluidas: 1,
      percentualConcluido: 25,
    })
  })

  it('lista vazia não produz percentual — indicador sem base é omitido, não zerado', () => {
    expect(resumoDoPlanejamento([], HOJE).percentualConcluido).toBeNull()
  })

  it('tarefa vencida e concluída conta só como concluída', () => {
    const resumo = resumoDoPlanejamento([tarefa('2026-01-01', true)], HOJE)
    expect(resumo.vencidas).toBe(0)
    expect(resumo.concluidas).toBe(1)
  })
})

describe('destaqueDoPlanejamento', () => {
  it('vencidas ganham de tudo — é o que pede providência hoje', () => {
    const resumo = resumoDoPlanejamento([tarefa('2026-09-01'), tarefa(HOJE)], HOJE)
    expect(destaqueDoPlanejamento(resumo)).toEqual({ tipo: 'vencidas', quantidade: 1 })
  })

  it('sem vencidas, a semana; sem as duas, o progresso', () => {
    expect(destaqueDoPlanejamento(resumoDoPlanejamento([tarefa(HOJE)], HOJE))).toEqual({
      tipo: 'esta_semana',
      quantidade: 1,
    })
    expect(
      destaqueDoPlanejamento(resumoDoPlanejamento([tarefa('2027-01-01', true)], HOJE)),
    ).toEqual({ tipo: 'progresso', concluidas: 1, total: 1 })
  })

  it('lista vazia não vira faixa no painel', () => {
    expect(destaqueDoPlanejamento(resumoDoPlanejamento([], HOJE))).toBeNull()
  })
})

describe('diasAteOEvento', () => {
  it('conta os dias entre hoje e o casamento', () => {
    expect(diasAteOEvento(EVENTO, HOJE)).toBe(272)
    expect(diasAteOEvento(HOJE, HOJE)).toBe(0)
  })

  it('atravessa a virada do ano e o ano bissexto sem perder um dia', () => {
    expect(diasAteOEvento('2027-01-01', '2026-12-31')).toBe(1)
    // 2028 é bissexto: fevereiro tem 29 dias.
    expect(diasAteOEvento('2028-03-01', '2028-02-28')).toBe(2)
  })

  it('fica negativo depois do casamento, e é null sem data', () => {
    expect(diasAteOEvento('2026-09-10', HOJE)).toBe(-3)
    expect(diasAteOEvento(null, HOJE)).toBeNull()
  })
})

describe('rotuloDaContagem', () => {
  it('concorda o plural e chama o dia de hoje pelo nome', () => {
    expect(rotuloDaContagem(272)).toBe('faltam 272 dias')
    expect(rotuloDaContagem(1)).toBe('falta 1 dia')
    expect(rotuloDaContagem(0)).toBe('é hoje')
  })

  it('cala depois do casamento — contagem regressiva de evento passado cobra, não informa', () => {
    expect(rotuloDaContagem(-1)).toBeNull()
    expect(rotuloDaContagem(null)).toBeNull()
  })
})
