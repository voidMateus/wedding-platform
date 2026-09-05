import { describe, expect, it } from 'vitest'
import { applyTableFilters, compareNumber, compareText } from '~/utils/table-rows'
import type { ClientColumn, ClientTableState } from '~/utils/table-rows'
import type { AdminTableColumn } from '~/types/table'

interface Presente {
  id: string
  titulo: string
  categoria: string
  status: 'disponivel' | 'reservado' | 'inativo'
  presenteadores: string[]
  valor: number
}

const rows: Presente[] = [
  {
    id: '1',
    titulo: 'Jogo de panelas',
    categoria: 'Cozinha',
    status: 'reservado',
    presenteadores: ['José Almeida'],
    valor: 45000,
  },
  {
    id: '2',
    titulo: 'Aspirador',
    categoria: 'Casa',
    status: 'disponivel',
    presenteadores: [],
    valor: 89000,
  },
  {
    id: '3',
    titulo: 'Cafeteira',
    categoria: 'Cozinha',
    status: 'inativo',
    presenteadores: ['Ana', 'Bruno'],
    valor: 12000,
  },
]

const columns: AdminTableColumn<Presente>[] = [
  { key: 'titulo', label: 'Presente', filter: { type: 'text' }, sort: 'alpha' },
  { key: 'categoria', label: 'Categoria', filter: { type: 'select', multiple: true } },
  { key: 'status', label: 'Status', filter: { type: 'select', multiple: true } },
  { key: 'quem', label: 'Reservado por', filter: { type: 'text' } },
  { key: 'valor', label: 'Valor', sort: 'numeric' },
  { key: 'semAcessor', label: 'Sem acessor', filter: { type: 'text' } },
]

const accessors: Record<string, ClientColumn<Presente>> = {
  titulo: { value: (row) => row.titulo, compare: compareText((row) => row.titulo) },
  categoria: { value: (row) => row.categoria },
  status: { value: (row) => row.status },
  quem: { value: (row) => row.presenteadores },
  valor: { compare: compareNumber((row) => row.valor) },
}

function state(overrides: Partial<ClientTableState> = {}): ClientTableState {
  return { values: {}, sortKey: null, sortDirection: 'asc', ...overrides }
}

function titles(result: Presente[]): string[] {
  return result.map((row) => row.titulo)
}

describe('applyTableFilters', () => {
  it('sem recorte nem ordenação, devolve a lista na ordem que veio', () => {
    expect(titles(applyTableFilters(rows, columns, accessors, state()))).toEqual([
      'Jogo de panelas',
      'Aspirador',
      'Cafeteira',
    ])
  })

  it('não muta a lista original ao ordenar', () => {
    const original = [...rows]
    applyTableFilters(rows, columns, accessors, state({ sortKey: 'titulo' }))
    expect(rows).toEqual(original)
  })

  it('filtra por texto ignorando acento e caixa', () => {
    const result = applyTableFilters(
      rows,
      columns,
      accessors,
      state({ values: { quem: ['jose'] } }),
    )
    expect(titles(result)).toEqual(['Jogo de panelas'])
  })

  it('casa com qualquer um dos valores da linha (linha com vários presenteadores)', () => {
    const result = applyTableFilters(rows, columns, accessors, state({ values: { quem: ['bru'] } }))
    expect(titles(result)).toEqual(['Cafeteira'])
  })

  it('valores marcados na mesma coluna são alternativas entre si', () => {
    const result = applyTableFilters(
      rows,
      columns,
      accessors,
      state({ values: { status: ['reservado', 'inativo'] } }),
    )
    expect(titles(result)).toEqual(['Jogo de panelas', 'Cafeteira'])
  })

  it('colunas diferentes somam condições', () => {
    const result = applyTableFilters(
      rows,
      columns,
      accessors,
      state({ values: { categoria: ['Cozinha'], status: ['inativo'] } }),
    )
    expect(titles(result)).toEqual(['Cafeteira'])
  })

  it('ordena nos dois sentidos', () => {
    const asc = applyTableFilters(rows, columns, accessors, state({ sortKey: 'valor' }))
    expect(titles(asc)).toEqual(['Cafeteira', 'Jogo de panelas', 'Aspirador'])

    const desc = applyTableFilters(
      rows,
      columns,
      accessors,
      state({ sortKey: 'valor', sortDirection: 'desc' }),
    )
    expect(titles(desc)).toEqual(['Aspirador', 'Jogo de panelas', 'Cafeteira'])
  })

  it('ordena texto pela regra do português', () => {
    const result = applyTableFilters(rows, columns, accessors, state({ sortKey: 'titulo' }))
    expect(titles(result)).toEqual(['Aspirador', 'Cafeteira', 'Jogo de panelas'])
  })

  it('coluna ordenável sem comparação declarada não reordena nada', () => {
    const result = applyTableFilters(rows, columns, accessors, state({ sortKey: 'categoria' }))
    expect(titles(result)).toEqual(['Jogo de panelas', 'Aspirador', 'Cafeteira'])
  })

  it('coluna filtrável sem acessor não esconde linha nenhuma', () => {
    const result = applyTableFilters(
      rows,
      columns,
      accessors,
      state({ values: { semAcessor: ['qualquer coisa'] } }),
    )
    expect(result).toHaveLength(3)
  })
})
