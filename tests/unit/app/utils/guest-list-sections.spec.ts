import { describe, expect, it } from 'vitest'
import {
  SECAO_SEM_GRUPO,
  montarSecoesDeConvidados,
} from '../../../../app/utils/guest-list-sections'

function grupo(id: string, nome: string, grupo_pai_id: string | null = null) {
  return { id, nome, grupo_pai_id }
}

function convidado(id: string, grupo_id: string | null = null) {
  return { id, grupo_id, status_rsvp: 'pendente' as const }
}

function convidadoComStatus(
  id: string,
  grupo_id: string | null,
  status_rsvp: 'pendente' | 'confirmado' | 'recusado' | 'lista_espera' | 'removido',
) {
  return { id, grupo_id, status_rsvp }
}

const MATEUS = grupo('r1', 'Família do Mateus')
const TIOS = grupo('s1', 'Tios paternos', 'r1')
const PRIMOS = grupo('s2', 'Primos', 'r1')

describe('montarSecoesDeConvidados', () => {
  it('põe o grupo antes das próprias subdivisões, cada um com as suas linhas', () => {
    const secoes = montarSecoesDeConvidados(
      [convidado('g1', 'r1'), convidado('g2', 's1'), convidado('g3', 's2')],
      [MATEUS, TIOS, PRIMOS],
    )

    expect(secoes.map((s) => [s.label, s.level, s.rows.length])).toEqual([
      ['Família do Mateus', 0, 1],
      ['Primos', 1, 1],
      ['Tios paternos', 1, 1],
    ])
  })

  // O convidado aponta sempre para a folha, então sem esta soma o grupo-pai
  // anunciaria 0 pessoas com 32 logo abaixo dele.
  it('soma as subdivisões na contagem do grupo-pai', () => {
    const secoes = montarSecoesDeConvidados(
      [convidado('g1', 'r1'), convidado('g2', 's1'), convidado('g3', 's1')],
      [MATEUS, TIOS],
    )

    // O denominador é o total da árvore; o numerador vem do mesmo rollup.
    expect(secoes[0]?.meta).toBe('0/3 confirmados')
    expect(secoes[1]?.meta).toBe('0/2 confirmados')
  })

  // Recolher o pai tem que recolher a árvore: a AdminTable só esconde as linhas
  // do próprio bloco, então o cabeçalho da subdivisão ficaria pendurado em nada.
  it('não desenha subdivisão de grupo recolhido', () => {
    const secoes = montarSecoesDeConvidados(
      [convidado('g1', 'r1'), convidado('g2', 's1')],
      [MATEUS, TIOS],
      { recolhidos: ['r1'] },
    )

    expect(secoes.map((s) => s.label)).toEqual(['Família do Mateus'])
    // O cabeçalho do pai continua, com a contagem cheia — é por ele que se
    // reabre o bloco.
    expect(secoes[0]?.meta).toBe('0/2 confirmados')
  })

  it('mantém grupo vazio quando não há filtro — é onde o casal vai adicionar gente', () => {
    const secoes = montarSecoesDeConvidados([], [MATEUS, TIOS])

    expect(secoes.map((s) => s.label)).toEqual(['Família do Mateus', 'Tios paternos'])
  })

  it('esconde bloco vazio sob filtro, para o recorte não virar parede de grupos', () => {
    const secoes = montarSecoesDeConvidados([convidado('g1', 's1')], [MATEUS, TIOS, PRIMOS], {
      esconderVazios: true,
    })

    expect(secoes.map((s) => s.label)).toEqual(['Família do Mateus', 'Tios paternos'])
  })

  it('mantém o grupo-pai visível sob filtro quando só a subdivisão casou', () => {
    const secoes = montarSecoesDeConvidados([convidado('g1', 's1')], [MATEUS, TIOS], {
      esconderVazios: true,
    })

    expect(secoes[0]?.label).toBe('Família do Mateus')
    expect(secoes[0]?.rows).toEqual([])
  })

  it('joga quem não tem grupo no último bloco', () => {
    const secoes = montarSecoesDeConvidados(
      [convidado('g1', 'r1'), convidado('g2', null)],
      [MATEUS],
    )

    expect(secoes.at(-1)).toMatchObject({ id: SECAO_SEM_GRUPO, label: 'Sem grupo', level: 0 })
    expect(secoes.at(-1)?.rows).toHaveLength(1)
  })

  it('omite o bloco "Sem grupo" quando todos têm grupo', () => {
    const secoes = montarSecoesDeConvidados([convidado('g1', 'r1')], [MATEUS])

    expect(secoes.some((s) => s.id === SECAO_SEM_GRUPO)).toBe(false)
  })

  it('ordena os blocos por nome, em português', () => {
    const secoes = montarSecoesDeConvidados(
      [],
      [grupo('r2', 'Ávila'), grupo('r1', 'Amigos'), grupo('r3', 'Zelda')],
    )

    expect(secoes.map((s) => s.label)).toEqual(['Amigos', 'Ávila', 'Zelda'])
  })

  describe('contagem de confirmados no cabeçalho', () => {
    it('anuncia quantos confirmaram, somando as subdivisões na raiz', () => {
      const secoes = montarSecoesDeConvidados(
        [
          convidadoComStatus('g1', 'r1', 'pendente'),
          convidadoComStatus('g2', 's1', 'confirmado'),
          convidadoComStatus('g3', 's1', 'confirmado'),
          convidadoComStatus('g4', 's1', 'recusado'),
        ],
        [MATEUS, TIOS],
      )

      // A raiz não tem confirmado NENHUM próprio: os dois estão na subdivisão.
      // Sem o rollup ela diria "0 confirmaram" com dois logo abaixo.
      // Mesma forma da tela de Grupos: "confirmados/total confirmados".
      expect(secoes.map((s) => [s.label, s.meta])).toEqual([
        ['Família do Mateus', '2/4 confirmados'],
        ['Tios paternos', '2/3 confirmados'],
      ])
    })

    it('mostra o zero no numerador quando o grupo tem gente e ninguém confirmou', () => {
      const secoes = montarSecoesDeConvidados(
        [convidadoComStatus('g1', 'r1', 'pendente'), convidadoComStatus('g2', 'r1', 'pendente')],
        [MATEUS],
      )

      expect(secoes[0]?.meta).toBe('0/2 confirmados')
    })

    // Grupo vazio mostra "0/0", igual em Grupos — sem caso especial.
    it('mostra 0/0 no grupo vazio', () => {
      const secoes = montarSecoesDeConvidados([], [MATEUS])

      expect(secoes[0]?.meta).toBe('0/0 confirmados')
    })

    // Chamador sem status (a Visão Geral monta blocos sem o campo) não pode
    // passar a anunciar "0 confirmaram" — isso seria afirmar o que não sabe.
    it('conta só quem está em "confirmado", ignorando os outros estados', () => {
      const secoes = montarSecoesDeConvidados(
        [
          convidadoComStatus('g1', 'r1', 'lista_espera'),
          convidadoComStatus('g2', 'r1', 'recusado'),
          convidadoComStatus('g3', 'r1', 'confirmado'),
        ],
        [MATEUS],
      )

      expect(secoes[0]?.meta).toBe('1/3 confirmados')
    })
  })
})
