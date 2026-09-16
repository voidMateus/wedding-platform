import { describe, expect, it } from 'vitest'
import {
  DIAS_APOS_O_EVENTO_PARA_ARQUIVAR,
  DIAS_DE_RASCUNHO_INTOCADO,
  DIAS_SEM_ATIVIDADE,
  diagnosticarPlataforma,
  type CasamentoObservado,
} from '#shared/diagnostico-da-plataforma'

/**
 * O detector de problemas do painel interno.
 *
 * O que este teste protege não é a contagem: é a promessa de que um casamento
 * saudável NUNCA aparece na lista de atenção. Um painel que acusa problema onde
 * não há é desligado mentalmente na terceira vez — e aí deixa de servir para o
 * caso real, que é o único motivo de ele existir.
 */

const HOJE = '2026-09-15'

function dias(n: number, a_partir_de = HOJE): string {
  const base = new Date(`${a_partir_de}T00:00:00`)
  base.setDate(base.getDate() + n)
  return base.toISOString()
}

function data(n: number): string {
  return dias(n).slice(0, 10)
}

/** Um casamento sem nada de errado: dono, convidados, evento longe, ativo ontem. */
function saudavel(patch: Partial<CasamentoObservado> = {}): CasamentoObservado {
  return {
    id: 'w1',
    nomesNoivos: 'Ana & Bruno',
    statusCicloVida: 'publicado',
    dataEvento: data(200),
    createdAt: dias(-120),
    contagemConvidados: 80,
    temDono: true,
    ultimaAtividadeEm: dias(-1),
    ...patch,
  }
}

function ids(achados: ReturnType<typeof diagnosticarPlataforma>): string[] {
  return achados.map((achado) => achado.id)
}

describe('diagnóstico da plataforma', () => {
  it('não acusa nada num casamento saudável', () => {
    expect(diagnosticarPlataforma([saudavel()], HOJE)).toEqual([])
  })

  it('não acusa nada num casamento recém-criado, que ainda não teve tempo de nada', () => {
    const novo = saudavel({
      statusCicloVida: 'rascunho',
      createdAt: dias(-1),
      contagemConvidados: 0,
      ultimaAtividadeEm: null,
    })
    expect(diagnosticarPlataforma([novo], HOJE)).toEqual([])
  })

  it('acusa casamento sem dono', () => {
    const achados = diagnosticarPlataforma([saudavel({ temDono: false })], HOJE)
    expect(ids(achados)).toContain('sem-dono')
    expect(achados[0]?.titulo).toBe('1 casamento sem dono')
    expect(achados[0]?.severidade).toBe('alerta')
  })

  it('acusa site publicado sem nenhum convidado', () => {
    const achados = diagnosticarPlataforma([saudavel({ contagemConvidados: 0 })], HOJE)
    expect(ids(achados)).toEqual(['publicado-sem-convidados'])
  })

  it('não acusa lista vazia em quem ainda não publicou', () => {
    const rascunho = saudavel({ statusCicloVida: 'rascunho', contagemConvidados: 0 })
    expect(ids(diagnosticarPlataforma([rascunho], HOJE))).toEqual([])
  })

  it('acusa parado perto do evento, inclusive quem nunca teve atividade', () => {
    const semAtividade = saudavel({ id: 'w1', dataEvento: data(30), ultimaAtividadeEm: null })
    const paradoHaMuito = saudavel({
      id: 'w2',
      dataEvento: data(30),
      ultimaAtividadeEm: dias(-DIAS_SEM_ATIVIDADE - 1),
    })
    const achados = diagnosticarPlataforma([semAtividade, paradoHaMuito], HOJE)
    const parado = achados.find((achado) => achado.id === 'parado-perto-do-evento')
    expect(parado?.casamentos.map((c) => c.id)).toEqual(['w1', 'w2'])
  })

  /** A borda que separa "está tudo bem" de "ligue para eles" precisa ser exata. */
  it('não acusa parado quem mexeu no painel dentro da janela', () => {
    const recente = saudavel({
      dataEvento: data(30),
      ultimaAtividadeEm: dias(-DIAS_SEM_ATIVIDADE + 1),
    })
    expect(ids(diagnosticarPlataforma([recente], HOJE))).toEqual([])
  })

  it('não acusa parado quando o evento ainda está longe', () => {
    const longe = saudavel({ dataEvento: data(300), ultimaAtividadeEm: dias(-90) })
    expect(ids(diagnosticarPlataforma([longe], HOJE))).toEqual([])
  })

  it('acusa rascunho que o casal nunca abriu', () => {
    const intocado = saudavel({
      statusCicloVida: 'rascunho',
      createdAt: dias(-DIAS_DE_RASCUNHO_INTOCADO - 1),
      ultimaAtividadeEm: null,
      dataEvento: data(300),
    })
    expect(ids(diagnosticarPlataforma([intocado], HOJE))).toContain('rascunho-intocado')
  })

  it('acusa evento que já aconteceu e continua na operação', () => {
    const passado = saudavel({ dataEvento: data(-DIAS_APOS_O_EVENTO_PARA_ARQUIVAR - 1) })
    expect(ids(diagnosticarPlataforma([passado], HOJE))).toContain('evento-passado-na-operacao')
  })

  it('não acusa evento recém-realizado — a festa acabou ontem', () => {
    const ontem = saudavel({ dataEvento: data(-1) })
    expect(ids(diagnosticarPlataforma([ontem], HOJE))).toEqual([])
  })

  /** Arquivar é a decisão já tomada: o que saiu da operação para de ser cobrado. */
  it('ignora arquivados por completo', () => {
    const arquivado = saudavel({
      statusCicloVida: 'arquivado',
      temDono: false,
      contagemConvidados: 0,
      dataEvento: data(-400),
      ultimaAtividadeEm: null,
    })
    expect(diagnosticarPlataforma([arquivado], HOJE)).toEqual([])
  })

  it('põe alerta antes de atenção, e o mais numeroso primeiro', () => {
    const lista: CasamentoObservado[] = [
      saudavel({ id: 'a', temDono: false }),
      saudavel({ id: 'b', contagemConvidados: 0 }),
      saudavel({ id: 'c', contagemConvidados: 0 }),
      saudavel({ id: 'd', dataEvento: data(-400) }),
    ]
    const achados = diagnosticarPlataforma(lista, HOJE)
    expect(ids(achados)).toEqual([
      'publicado-sem-convidados',
      'sem-dono',
      'evento-passado-na-operacao',
    ])
  })

  it('deixa o mesmo casamento aparecer em dois achados diferentes', () => {
    const doisProblemas = saudavel({
      temDono: false,
      dataEvento: data(30),
      ultimaAtividadeEm: null,
    })
    const achados = diagnosticarPlataforma([doisProblemas], HOJE)
    expect(ids(achados)).toEqual(['sem-dono', 'parado-perto-do-evento'])
  })

  it('todo achado traz uma saída — nunca só a má notícia', () => {
    const lista = [saudavel({ temDono: false }), saudavel({ id: 'z', dataEvento: data(-400) })]
    for (const achado of diagnosticarPlataforma(lista, HOJE)) {
      expect(achado.acao.length).toBeGreaterThan(0)
    }
  })
})
