import { describe, expect, it } from 'vitest'
import { montarOpcoesDeGrupo } from '../../../../app/utils/group-options'

function grupo(id: string, nome: string, grupo_pai_id: string | null = null) {
  return { id, nome, grupo_pai_id }
}

describe('montarOpcoesDeGrupo', () => {
  it('deixa grupo de primeiro nível com o nome cru', () => {
    const opcoes = montarOpcoesDeGrupo([grupo('r1', 'Família do Mateus')])

    expect(opcoes).toEqual([{ value: 'r1', label: 'Família do Mateus' }])
  })

  // Sem qualificar, duas famílias com "Primos" viram duas opções escritas
  // igual, e o casal não tem como saber qual está escolhendo.
  it('qualifica a subdivisão pelo grupo-pai', () => {
    const opcoes = montarOpcoesDeGrupo([
      grupo('r1', 'Família do Mateus'),
      grupo('r2', 'Família da Raquel'),
      grupo('s1', 'Primos', 'r1'),
      grupo('s2', 'Primos', 'r2'),
    ])

    expect(opcoes.map((o) => o.label)).toEqual([
      'Família da Raquel',
      'Família da Raquel › Primos',
      'Família do Mateus',
      'Família do Mateus › Primos',
    ])
  })

  it('ordena em árvore: o grupo vem logo antes das próprias subdivisões', () => {
    const opcoes = montarOpcoesDeGrupo([
      grupo('s1', 'Tios paternos', 'r1'),
      grupo('r2', 'Trabalho'),
      grupo('r1', 'Família do Mateus'),
    ])

    expect(opcoes.map((o) => o.label)).toEqual([
      'Família do Mateus',
      'Família do Mateus › Tios paternos',
      'Trabalho',
    ])
  })

  // Acontece de verdade: a listagem pede só os grupos ativos e o pai está
  // arquivado. Opção sem contexto é ruim; opção sem rótulo é pior.
  it('cai no nome cru quando o grupo-pai não veio na mesma resposta', () => {
    const opcoes = montarOpcoesDeGrupo([grupo('s1', 'Primos', 'ausente')])

    expect(opcoes).toEqual([{ value: 's1', label: 'Primos' }])
  })
})
