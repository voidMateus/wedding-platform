import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'
import type { AdminTableColumn, TableActiveFilter, TableSortDirection } from '~/types/table'

/**
 * Estado dos filtros por coluna das tabelas do admin, guardado na URL.
 *
 * Na URL e não em `ref` local pela mesma razão que o recorte por faixa etária
 * da listagem de convidados já vivia lá: o dashboard linka direto para "as 8
 * crianças", a busca global linka para um registro e o botão Voltar precisa
 * desfazer o recorte, não a página inteira. Cada coluna usa o próprio `key`
 * como nome do parâmetro (`?grupo=<uuid>&faixa=crianca`), então os links que
 * já existiam continuam valendo.
 *
 * As regras (validar valor de select, alternar sentido, montar os chips do que
 * está ativo) ficam em `~/utils/table-filters` — aqui é só a ligação com a
 * URL, que é a parte que depende do runtime do Nuxt.
 */

function firstQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

export interface TableFiltersApi {
  /** Valor de cada coluna filtrada, pronto pra virar parâmetro do endpoint. */
  values: ComputedRef<Record<string, string>>
  activeFilters: ComputedRef<TableActiveFilter[]>
  hasActive: ComputedRef<boolean>
  sortKey: ComputedRef<string | null>
  sortDirection: ComputedRef<TableSortDirection>
  valueOf: (key: string) => string
  sortOf: (key: string) => TableSortDirection | null
  isActive: (key: string) => boolean
  setValue: (key: string, value: string) => void
  setSort: (key: string, direction: TableSortDirection) => void
  clearColumn: (key: string) => void
  clearAll: () => void
}

export function useTableFilters<T>(
  columns: MaybeRefOrGetter<readonly AdminTableColumn<T>[]>,
): TableFiltersApi {
  const route = useRoute()
  const router = useRouter()

  const list = computed(() => toValue(columns))

  function valueOf(key: string): string {
    const column = list.value.find((item) => item.key === key)
    return resolveFilterValue(column, firstQueryValue(route.query[key]))
  }

  const values = computed(() => {
    const result: Record<string, string> = {}
    for (const column of list.value) {
      if (!column.filter) continue
      const value = valueOf(column.key)
      if (value) result[column.key] = value
    }
    return result
  })

  const sortKey = computed(() => {
    const raw = firstQueryValue(route.query[TABLE_SORT_KEY_PARAM])
    return list.value.find((column) => column.key === raw && column.sort)?.key ?? null
  })

  const sortDirection = computed<TableSortDirection>(() =>
    firstQueryValue(route.query[TABLE_SORT_DIRECTION_PARAM]) === 'desc' ? 'desc' : 'asc',
  )

  function sortOf(key: string): TableSortDirection | null {
    return sortKey.value === key ? sortDirection.value : null
  }

  function isActive(key: string): boolean {
    return Boolean(valueOf(key)) || sortKey.value === key
  }

  const activeFilters = computed(() => buildActiveFilters(list.value, values.value))

  const hasActive = computed(() => activeFilters.value.length > 0 || sortKey.value !== null)

  // Só as chaves do patch são mexidas: `?novo=1`/`?editar=<id>` governam os
  // modais das listagens e não podem ser perdidos ao filtrar.
  function applyQuery(patch: Record<string, string | undefined>): void {
    const merged: LocationQueryRaw = { ...route.query, ...patch }
    const query = Object.fromEntries(
      Object.entries(merged).filter(([, value]) => value !== undefined && value !== ''),
    )
    void router.replace({ query })
  }

  function setValue(key: string, value: string): void {
    applyQuery({ [key]: value.trim() || undefined })
  }

  function setSort(key: string, direction: TableSortDirection): void {
    applyQuery(
      buildSortPatch(key, direction, { key: sortKey.value, direction: sortDirection.value }),
    )
  }

  function clearColumn(key: string): void {
    applyQuery({
      [key]: undefined,
      ...(sortKey.value === key
        ? { [TABLE_SORT_KEY_PARAM]: undefined, [TABLE_SORT_DIRECTION_PARAM]: undefined }
        : {}),
    })
  }

  function clearAll(): void {
    applyQuery(buildClearAllPatch(list.value))
  }

  return {
    values,
    activeFilters,
    hasActive,
    sortKey,
    sortDirection,
    valueOf,
    sortOf,
    isActive,
    setValue,
    setSort,
    clearColumn,
    clearAll,
  }
}
