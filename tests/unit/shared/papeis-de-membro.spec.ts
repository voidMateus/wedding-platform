import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PAPEIS_DE_MEMBRO,
  papeisQuePodeConceder,
  podeGerenciarPapel,
  postoDoPapel,
  rotuloDoPapel,
  type PapelDeMembro,
} from '#shared/papeis-de-membro'

describe('escada de papéis', () => {
  it('cada papel alcança todo papel abaixo do seu', () => {
    expect(podeGerenciarPapel('dono', 'planejador')).toBe(true)
    expect(podeGerenciarPapel('dono', 'colaborador')).toBe(true)
    expect(podeGerenciarPapel('planejador', 'colaborador')).toBe(true)
  })

  it('o dono alcança outro dono', () => {
    // O casal são dois: um precisa poder remover o outro. Perder isto seria
    // regressão silenciosa do comportamento que sempre existiu.
    expect(podeGerenciarPapel('dono', 'dono')).toBe(true)
  })

  it('ninguém se promove', () => {
    // O papel CONCEDIDO também precisa ser alcançável por quem concede — é o
    // que impede um planejador de criar outro planejador, ou um dono.
    expect(podeGerenciarPapel('planejador', 'planejador')).toBe(false)
    expect(podeGerenciarPapel('planejador', 'dono')).toBe(false)
    expect(podeGerenciarPapel('colaborador', 'colaborador')).toBe(false)
    expect(podeGerenciarPapel('colaborador', 'planejador')).toBe(false)
    expect(podeGerenciarPapel('colaborador', 'dono')).toBe(false)
  })

  it('colaborador não gerencia ninguém', () => {
    expect(papeisQuePodeConceder('colaborador')).toEqual([])
  })

  it('planejador só concede colaborador', () => {
    expect(papeisQuePodeConceder('planejador')).toEqual(['colaborador'])
  })

  it('dono concede os três', () => {
    expect(papeisQuePodeConceder('dono')).toEqual(['dono', 'planejador', 'colaborador'])
  })

  it('a ordem dos postos é estrita', () => {
    expect(postoDoPapel('dono')).toBeGreaterThan(postoDoPapel('planejador'))
    expect(postoDoPapel('planejador')).toBeGreaterThan(postoDoPapel('colaborador'))
  })

  it('o planejador se chama "Assessoria" na tela do casal', () => {
    // "Planejador" é o nome no código e na coluna; "Assessoria" é a palavra
    // que o casal usa — mesma separação de "Acompanhantes"/"núcleo".
    expect(rotuloDoPapel('planejador')).toBe('Assessoria')
    expect(rotuloDoPapel('dono')).toBe('Dono')
    expect(rotuloDoPapel('colaborador')).toBe('Colaborador')
  })
})

describe('par com o SQL', () => {
  /**
   * `shared/papeis-de-membro.ts` e as funções `posto_do_papel`/
   * `pode_gerenciar_papel` do Postgres são a MESMA regra escrita duas vezes
   * (docs/fase5-multievento.md 4.3). Sem esta trava, acrescentar um papel só
   * de um lado passaria despercebido até alguém ser barrado — ou não ser.
   */
  const migration = readFileSync(
    join(process.cwd(), 'supabase', 'migrations', '20260915100001_papel_planejador.sql'),
    'utf8',
  )

  it('o CHECK da coluna conhece exatamente os mesmos papéis', () => {
    const check = migration.match(/check \(papel in \(([^)]+)\)\)/)?.[1] ?? ''
    const noSql = check
      .split(',')
      .map((valor) => valor.trim().replace(/'/g, ''))
      .sort()

    expect(noSql).toEqual([...PAPEIS_DE_MEMBRO].sort())
  })

  it('posto_do_papel atribui os mesmos postos', () => {
    for (const papel of PAPEIS_DE_MEMBRO) {
      const noSql = migration.match(new RegExp(`when '${papel}' then (\\d+)`))?.[1]
      expect(Number(noSql), `posto de ${papel} divergente entre TS e SQL`).toBe(
        postoDoPapel(papel as PapelDeMembro),
      )
    }
  })
})
