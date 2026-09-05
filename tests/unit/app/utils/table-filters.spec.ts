import { describe, expect, it } from 'vitest'
import {
  TABLE_SORT_DIRECTION_PARAM,
  TABLE_SORT_KEY_PARAM,
  buildActiveFilters,
  buildClearAllPatch,
  buildSortPatch,
  resolveFilterValues,
  serializeFilterValues,
  tableSortLabels,
  toggleFilterValue,
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

const faixa: AdminTableColumn<Row> = {
  key: 'faixa',
  label: 'Faixa etária',
  filter: {
    type: 'select',
    multiple: true,
    options: [
      { value: 'crianca', label: 'Crianças' },
      { value: 'adolescente', label: 'Adolescentes' },
      { value: 'adulto', label: 'Adultos' },
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

describe('resolveFilterValues', () => {
  it('devolve vazio para coluna sem filtro declarado', () => {
    expect(resolveFilterValues(acompanhantes, 'qualquer coisa')).toEqual([])
  })

  it('devolve vazio quando a coluna não existe na tabela', () => {
    expect(resolveFilterValues(undefined, 'ana')).toEqual([])
  })

  it('aceita e apara texto livre', () => {
    expect(resolveFilterValues(nome, '  ana  ')).toEqual(['ana'])
    expect(resolveFilterValues(nome, '   ')).toEqual([])
  })

  it('não divide texto livre pela vírgula (é conteúdo do nome, não separador)', () => {
    expect(resolveFilterValues(nome, 'Silva, Jr.')).toEqual(['Silva, Jr.'])
  })

  it('lê vários valores de uma coluna de múltipla escolha', () => {
    expect(resolveFilterValues(faixa, 'crianca,adolescente')).toEqual(['crianca', 'adolescente'])
  })

  it('descarta valor fora da lista de opções (URL editada à mão viraria 400 no endpoint)', () => {
    expect(resolveFilterValues(grupo, 'inexistente')).toEqual([])
    expect(resolveFilterValues(faixa, 'crianca,inventada')).toEqual(['crianca'])
  })

  it('deixa passar o valor enquanto a lista de opções ainda não chegou', () => {
    const carregando: AdminTableColumn<Row> = { ...grupo, filter: { type: 'select', options: [] } }
    expect(resolveFilterValues(carregando, 'g2')).toEqual(['g2'])
  })

  it('coluna de valor único com dois valores na URL fica com o primeiro', () => {
    expect(resolveFilterValues(grupo, 'g2,g1')).toEqual(['g2'])
  })

  it('ignora repetição e entradas vazias', () => {
    expect(resolveFilterValues(faixa, 'crianca,,crianca,adulto')).toEqual(['crianca', 'adulto'])
  })
})

describe('serializeFilterValues', () => {
  it('junta por vírgula e some da URL quando não há nada marcado', () => {
    expect(serializeFilterValues(['crianca', 'adulto'])).toBe('crianca,adulto')
    expect(serializeFilterValues([])).toBeUndefined()
  })
})

describe('toggleFilterValue', () => {
  it('valor único: marcar troca a opção anterior', () => {
    expect(toggleFilterValue(['g1'], 'g2')).toEqual(['g2'])
  })

  it('valor único: clicar de novo na opção marcada desmarca', () => {
    expect(toggleFilterValue(['g1'], 'g1')).toEqual([])
  })

  it('múltipla escolha: acumula e desmarca uma por vez', () => {
    const comCrianca = toggleFilterValue([], 'crianca', { multiple: true })
    expect(comCrianca).toEqual(['crianca'])

    const comAdolescente = toggleFilterValue(comCrianca, 'adolescente', { multiple: true })
    expect(comAdolescente).toEqual(['crianca', 'adolescente'])

    expect(toggleFilterValue(comAdolescente, 'crianca', { multiple: true })).toEqual([
      'adolescente',
    ])
  })

  it('a opção vazia limpa a seleção inteira, nunca vira mais um valor marcado', () => {
    expect(toggleFilterValue(['crianca', 'adulto'], '', { multiple: true })).toEqual([])
    expect(toggleFilterValue(['g1'], '')).toEqual([])
  })
})

describe('buildActiveFilters', () => {
  it('devolve um chip por valor marcado, na ordem das colunas', () => {
    const chips = buildActiveFilters([nome, faixa, acompanhantes], {
      faixa: ['crianca', 'adulto'],
      nome: ['ana'],
    })
    expect(chips).toEqual([
      { key: 'nome', value: 'ana', columnLabel: 'Convidado', valueLabel: 'ana' },
      { key: 'faixa', value: 'crianca', columnLabel: 'Faixa etária', valueLabel: 'Crianças' },
      { key: 'faixa', value: 'adulto', columnLabel: 'Faixa etária', valueLabel: 'Adultos' },
    ])
  })

  it('mostra o rótulo da opção, não o valor cru (uuid de grupo não diz nada a quem lê)', () => {
    const [chip] = buildActiveFilters([grupo], { grupo: ['g2'] })
    expect(chip?.valueLabel).toBe('Trabalho')
  })

  it('ignora coluna sem valor', () => {
    expect(buildActiveFilters([nome, grupo], { nome: [] })).toEqual([])
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
    expect(buildClearAllPatch([nome, faixa, acompanhantes])).toEqual({
      [TABLE_SORT_KEY_PARAM]: undefined,
      [TABLE_SORT_DIRECTION_PARAM]: undefined,
      nome: undefined,
      faixa: undefined,
    })
  })
})
