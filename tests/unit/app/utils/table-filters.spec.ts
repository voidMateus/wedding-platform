import { describe, expect, it } from 'vitest'
import {
  TABLE_SORT_DIRECTION_PARAM,
  TABLE_SORT_KEY_PARAM,
  buildActiveFilters,
  buildClearAllPatch,
  buildSortPatch,
  resolveFilterValue,
  tableSortLabels,
} from '~/utils/table-filters'
import type { AdminTableColumn } from '~/types/table'

interface Row {
  id: string
}

const nome: AdminTableColumn<Row> = {
  key: 'nome',
  label: 'Convidado',
  filter: { type: 'text' },
  sort: 'alpha',
}

const grupo: AdminTableColumn<Row> = {
  key: 'grupo',
  label: 'Grupo',
  filter: {
    type: 'select',
    options: [
      { value: 'g1', label: 'Família da Noiva' },
      { value: 'g2', label: 'Trabalho' },
    ],
  },
}

const acompanhantes: AdminTableColumn<Row> = { key: 'acompanhantes', label: 'Acompanhantes' }

describe('tableSortLabels', () => {
  it('usa o par de rótulos do tipo do dado', () => {
    expect(tableSortLabels('alpha')).toEqual({ asc: 'A a Z', desc: 'Z a A' })
    expect(tableSortLabels('numeric')).toEqual({ asc: 'Menor a maior', desc: 'Maior a menor' })
    expect(tableSortLabels('date').desc).toBe('Mais recente a mais antiga')
  })
})

describe('resolveFilterValue', () => {
  it('devolve vazio para coluna sem filtro declarado', () => {
    expect(resolveFilterValue(acompanhantes, 'qualquer coisa')).toBe('')
  })

  it('devolve vazio quando a coluna não existe na tabela', () => {
    expect(resolveFilterValue(undefined, 'ana')).toBe('')
  })

  it('aceita e apara texto livre', () => {
    expect(resolveFilterValue(nome, '  ana  ')).toBe('ana')
    expect(resolveFilterValue(nome, '   ')).toBe('')
  })

  it('aceita valor de select que existe na lista', () => {
    expect(resolveFilterValue(grupo, 'g2')).toBe('g2')
  })

  it('descarta valor de select fora da lista (URL editada à mão viraria 400 no endpoint)', () => {
    expect(resolveFilterValue(grupo, 'inexistente')).toBe('')
  })

  it('deixa passar o valor enquanto a lista de opções ainda não chegou', () => {
    const carregando: AdminTableColumn<Row> = { ...grupo, filter: { type: 'select', options: [] } }
    expect(resolveFilterValue(carregando, 'g2')).toBe('g2')
  })
})

describe('buildActiveFilters', () => {
  it('devolve um chip por coluna preenchida, na ordem das colunas', () => {
    const chips = buildActiveFilters([nome, grupo, acompanhantes], { grupo: 'g1', nome: 'ana' })
    expect(chips).toEqual([
      { key: 'nome', columnLabel: 'Convidado', valueLabel: 'ana' },
      { key: 'grupo', columnLabel: 'Grupo', valueLabel: 'Família da Noiva' },
    ])
  })

  it('mostra o rótulo da opção, não o valor cru (uuid de grupo não diz nada a quem lê)', () => {
    const [chip] = buildActiveFilters([grupo], { grupo: 'g2' })
    expect(chip?.valueLabel).toBe('Trabalho')
  })

  it('ignora coluna sem valor', () => {
    expect(buildActiveFilters([nome, grupo], { nome: '' })).toEqual([])
  })
})

describe('buildSortPatch', () => {
  it('liga a ordenação na coluna pedida', () => {
    expect(buildSortPatch('nome', 'asc', { key: null, direction: 'asc' })).toEqual({
      [TABLE_SORT_KEY_PARAM]: 'nome',
      [TABLE_SORT_DIRECTION_PARAM]: 'asc',
    })
  })

  it('troca a coluna ordenada (uma por vez, como o endpoint aceita)', () => {
    expect(buildSortPatch('grupo', 'desc', { key: 'nome', direction: 'asc' })).toEqual({
      [TABLE_SORT_KEY_PARAM]: 'grupo',
      [TABLE_SORT_DIRECTION_PARAM]: 'desc',
    })
  })

  it('clicar de novo no sentido já ativo volta à ordem padrão da lista', () => {
    expect(buildSortPatch('nome', 'desc', { key: 'nome', direction: 'desc' })).toEqual({
      [TABLE_SORT_KEY_PARAM]: undefined,
      [TABLE_SORT_DIRECTION_PARAM]: undefined,
    })
  })

  it('inverter o sentido da mesma coluna mantém a ordenação ligada', () => {
    expect(buildSortPatch('nome', 'desc', { key: 'nome', direction: 'asc' })).toEqual({
      [TABLE_SORT_KEY_PARAM]: 'nome',
      [TABLE_SORT_DIRECTION_PARAM]: 'desc',
    })
  })
})

describe('buildClearAllPatch', () => {
  it('apaga toda coluna filtrável e a ordenação, e só isso', () => {
    expect(buildClearAllPatch([nome, grupo, acompanhantes])).toEqual({
      [TABLE_SORT_KEY_PARAM]: undefined,
      [TABLE_SORT_DIRECTION_PARAM]: undefined,
      nome: undefined,
      grupo: undefined,
    })
  })
})
