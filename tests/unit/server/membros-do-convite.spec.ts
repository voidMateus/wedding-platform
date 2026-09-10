import { describe, expect, it } from 'vitest'
import { ordenarMembrosDoConvite } from '../../../server/utils/membros-do-convite'

/**
 * O defeito que estes testes travam: os dois lugares que listam membros de um
 * convite ordenavam por `ordem_nucleo`, que é a posição DENTRO de um núcleo de
 * Acompanhantes. Com dois núcleos no mesmo convite a sequência era 0,1,0,1, e
 * com gente sem núcleo era 0 para todos — ordem arbitrária com cara de
 * intencional.
 */
function membro(
  id: string,
  nome_completo: string,
  nucleo_id: string | null = null,
  ordem_nucleo = 0,
) {
  return { id, nome_completo, nucleo_id, ordem_nucleo }
}

function nomes(membros: ReturnType<typeof membro>[]): string[] {
  return ordenarMembrosDoConvite(membros).map((m) => m.nome_completo)
}

describe('ordenarMembrosDoConvite', () => {
  it('mantém cada núcleo junto e ordena os blocos pelo primeiro nome de cada um', () => {
    // Dois casais no mesmo convite: era exatamente o caso em que ordenar por
    // ordem_nucleo devolvia 0,1,0,1 e separava os casais.
    expect(
      nomes([
        membro('1', 'Pedro Souza', 'nucleo-b', 0),
        membro('2', 'Ana Lima', 'nucleo-a', 0),
        membro('3', 'Carla Souza', 'nucleo-b', 1),
        membro('4', 'Bruno Lima', 'nucleo-a', 1),
      ]),
    ).toEqual(['Ana Lima', 'Bruno Lima', 'Pedro Souza', 'Carla Souza'])
  })

  it('intercala quem não tem núcleo na mesma ordem alfabética, sem lista separada', () => {
    expect(
      nomes([
        membro('1', 'Zeca Avulso'),
        membro('2', 'Ana Lima', 'nucleo-a', 0),
        membro('3', 'Bruno Lima', 'nucleo-a', 1),
        membro('4', 'Beto Avulso'),
      ]),
    ).toEqual(['Ana Lima', 'Bruno Lima', 'Beto Avulso', 'Zeca Avulso'])
  })

  it('respeita a ordem interna do núcleo, não o alfabeto, dentro do bloco', () => {
    // "João e Maria" é escolha do casal (`primaryPosition`); o alfabeto não
    // pode reescrevê-la para "Maria e João".
    expect(
      nomes([membro('1', 'Maria Silva', 'nucleo-a', 1), membro('2', 'Joao Silva', 'nucleo-a', 0)]),
    ).toEqual(['Joao Silva', 'Maria Silva'])
  })

  it('não depende de a consulta ter ordenado antes: acha o líder pelo menor ordem_nucleo', () => {
    expect(
      nomes([
        membro('1', 'Carla Souza', 'nucleo-b', 2),
        membro('2', 'Pedro Souza', 'nucleo-b', 0),
        membro('3', 'Tiago Souza', 'nucleo-b', 1),
      ]),
    ).toEqual(['Pedro Souza', 'Tiago Souza', 'Carla Souza'])
  })

  it('não intercala blocos diferentes quando o nome do líder é o mesmo', () => {
    const ordenados = ordenarMembrosDoConvite([
      membro('1', 'Joao Silva', 'nucleo-a', 0),
      membro('2', 'Joao Silva', 'nucleo-b', 0),
      membro('3', 'Ana Silva', 'nucleo-a', 1),
      membro('4', 'Bia Silva', 'nucleo-b', 1),
    ])
    // Cada núcleo ocupa duas posições contíguas — qual vem primeiro é
    // indiferente, misturar não é.
    expect(ordenados[0]!.nucleo_id).toBe(ordenados[1]!.nucleo_id)
    expect(ordenados[2]!.nucleo_id).toBe(ordenados[3]!.nucleo_id)
    expect(ordenados[0]!.nucleo_id).not.toBe(ordenados[2]!.nucleo_id)
  })

  it('ordena por acentuação como pt-BR, não por código de caractere', () => {
    expect(nomes([membro('1', 'Zulmira'), membro('2', 'Ávila')])).toEqual(['Ávila', 'Zulmira'])
  })

  it('não muta o array recebido', () => {
    const entrada = [membro('1', 'Zeca'), membro('2', 'Ana')]
    ordenarMembrosDoConvite(entrada)
    expect(entrada.map((m) => m.nome_completo)).toEqual(['Zeca', 'Ana'])
  })

  it('devolve lista vazia sem quebrar', () => {
    expect(ordenarMembrosDoConvite([])).toEqual([])
  })
})
