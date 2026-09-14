import { describe, expect, it } from 'vitest'
import {
  destaqueDoPlanejamento,
  janelaDaSugestao,
  janelaDaTarefa,
  prazoSugerido,
  resumoDoPlanejamento,
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

  it('as bordas das janelas: 7 dias é semana, 8 é mês, 31 é mais adiante', () => {
    expect(janelaDaTarefa(tarefa('2026-09-20'), HOJE)).toBe('esta_semana')
    expect(janelaDaTarefa(tarefa('2026-09-21'), HOJE)).toBe('este_mes')
    expect(janelaDaTarefa(tarefa('2026-10-13'), HOJE)).toBe('este_mes')
    expect(janelaDaTarefa(tarefa('2026-10-14'), HOJE)).toBe('mais_adiante')
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
    expect(janelaDaSugestao(sugestao('depois'), EVENTO, HOJE)).toBe('mais_adiante')
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
