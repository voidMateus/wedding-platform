import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import AdminTable from '~/components/admin/AdminTable.vue'
import AdminColumnFilter from '~/components/admin/AdminColumnFilter.vue'
import Input from '~/components/ui/Input.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'
import type { TableFiltersApi } from '~/composables/useTableFilters'
import type { AdminTableColumn, TableSortDirection } from '~/types/table'

interface Row {
  id: string
  nome: string
}

const rows: Row[] = [
  { id: '1', nome: 'Ana' },
  { id: '2', nome: 'Bruno' },
]

const columns: AdminTableColumn<Row>[] = [
  {
    key: 'nome',
    label: 'Convidado',
    filter: { type: 'text' },
    sort: 'alpha',
    value: (row) => row.nome,
  },
  { key: 'grupo', label: 'Grupo', value: () => '—' },
]

/** Dublê do estado de filtros — o de verdade mora na URL (useTableFilters). */
function makeFilters(initial: { value?: string; sortKey?: string | null } = {}): TableFiltersApi {
  const value = ref(initial.value ?? '')
  const sortKey = ref<string | null>(initial.sortKey ?? null)
  const sortDirection = ref<TableSortDirection>('asc')

  return {
    values: computed(() => (value.value ? { nome: value.value } : {})),
    activeFilters: computed(() => []),
    hasActive: computed(() => Boolean(value.value) || sortKey.value !== null),
    sortKey: computed(() => sortKey.value),
    sortDirection: computed(() => sortDirection.value),
    valueOf: (key) => (key === 'nome' ? value.value : ''),
    sortOf: (key) => (sortKey.value === key ? sortDirection.value : null),
    isActive: (key) => (key === 'nome' && Boolean(value.value)) || sortKey.value === key,
    setValue: vi.fn(),
    setSort: vi.fn(),
    clearColumn: vi.fn(),
    clearAll: vi.fn(),
  }
}

function mountTable(filters?: TableFiltersApi) {
  return mount(AdminTable, {
    props: { columns, rows, ...(filters ? { filters } : {}) },
    global: {
      components: { AdminColumnFilter, UiInput: Input },
      stubs: ICON_STUBS,
    },
  })
}

describe('AdminTable — filtros por coluna', () => {
  it('não desenha gatilho de filtro quando a página não passa o estado de filtros', () => {
    const wrapper = mountTable()
    expect(wrapper.find('thead button').exists()).toBe(false)
  })

  it('só a coluna que declara filter/sort ganha o gatilho', () => {
    const wrapper = mountTable(makeFilters())
    const triggers = wrapper.findAll('thead button')
    expect(triggers).toHaveLength(1)
    expect(triggers[0]?.attributes('aria-label')).toBe('Filtrar e ordenar por Convidado')
  })

  it('anuncia a ordenação da coluna ordenável para leitor de tela', () => {
    const semOrdem = mountTable(makeFilters())
    const headers = semOrdem.findAll('thead th')
    expect(headers[0]?.attributes('aria-sort')).toBe('none')
    // Coluna sem ordenação declarada não anuncia nada — não é "sem ordem", é
    // "não ordenável".
    expect(headers[1]?.attributes('aria-sort')).toBeUndefined()

    const ordenada = mountTable(makeFilters({ sortKey: 'nome' }))
    expect(ordenada.findAll('thead th')[0]?.attributes('aria-sort')).toBe('ascending')
  })

  it('marca o gatilho da coluna com recorte aplicado', () => {
    const semFiltro = mountTable(makeFilters())
    expect(semFiltro.find('thead button').classes()).not.toContain('text-primary')

    const comFiltro = mountTable(makeFilters({ value: 'ana' }))
    expect(comFiltro.find('thead button').classes()).toContain('text-primary')
  })

  it('continua desenhando as linhas normalmente com os filtros ligados', () => {
    const wrapper = mountTable(makeFilters())
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.text()).toContain('Bruno')
  })
})
