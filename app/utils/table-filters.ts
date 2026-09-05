import type {
  AdminTableColumn,
  TableActiveFilter,
  TableSortDirection,
  TableSortKind,
} from '~/types/table'

/**
 * As regras dos filtros por coluna das tabelas do admin, separadas de onde o
 * estado é guardado (a URL, em `useTableFilters`).
 *
 * A separação é o que torna as regras testáveis: aqui não há `useRoute` nem
 * `useRouter`, então cada decisão — validar valor de select, montar os chips
 * do que está ativo, alternar o sentido da ordenação — é função pura com
 * entrada e saída, como o resto de `app/utils/`.
 */

export const TABLE_SORT_KEY_PARAM = 'ordenar'
export const TABLE_SORT_DIRECTION_PARAM = 'direcao'

const SORT_LABELS: Record<TableSortKind, { asc: string; desc: string }> = {
  alpha: { asc: 'A a Z', desc: 'Z a A' },
  numeric: { asc: 'Menor a maior', desc: 'Maior a menor' },
  date: { asc: 'Mais antiga a mais recente', desc: 'Mais recente a mais antiga' },
}

/** Par de rótulos do menu "Ordenar" — o sentido só faz sentido junto do tipo do dado. */
export function tableSortLabels(kind: TableSortKind): { asc: string; desc: string } {
  return SORT_LABELS[kind]
}

/**
 * Valor de filtro que a coluna aceita, a partir do que veio da URL.
 *
 * Valor de select fora da lista é descartado: a URL é editável à mão e um
 * valor inventado vira 400 no endpoint (que valida por Zod), derrubando a tela
 * inteira em vez de mostrar a lista sem recorte. Só que a lista de opções de
 * vários recortes vem de outra requisição (grupos, categorias) e chega vazia
 * no primeiro render — validar contra lista vazia descartaria o recorte de um
 * link legítimo, então lista vazia deixa o valor passar.
 */
export function resolveFilterValue<T>(
  column: AdminTableColumn<T> | undefined,
  raw: string,
): string {
  const filter = column?.filter
  if (!filter) return ''

  const value = raw.trim()
  if (!value) return ''

  const options = filter.options ?? []
  if (filter.type === 'select' && options.length) {
    return options.some((option) => option.value === value) ? value : ''
  }
  return value
}

/** Um chip por coluna com filtro preenchido, na ordem das colunas da tabela. */
export function buildActiveFilters<T>(
  columns: readonly AdminTableColumn<T>[],
  values: Record<string, string>,
): TableActiveFilter[] {
  return columns.flatMap((column) => {
    const value = values[column.key]
    if (!value) return []
    const option = column.filter?.options?.find((item) => item.value === value)
    return [{ key: column.key, columnLabel: column.label, valueLabel: option?.label ?? value }]
  })
}

/**
 * Parâmetros de URL de um clique no menu "Ordenar".
 *
 * Uma coluna ordenada por vez (o parâmetro é um só, como o `sort` que os
 * endpoints aceitam), e clicar de novo na direção já ativa desliga a
 * ordenação — sem isso não haveria como voltar à ordem padrão da lista depois
 * de ordenar uma vez.
 */
export function buildSortPatch(
  key: string,
  direction: TableSortDirection,
  current: { key: string | null; direction: TableSortDirection },
): Record<string, string | undefined> {
  const isCurrent = current.key === key && current.direction === direction
  return {
    [TABLE_SORT_KEY_PARAM]: isCurrent ? undefined : key,
    [TABLE_SORT_DIRECTION_PARAM]: isCurrent ? undefined : direction,
  }
}

/** Parâmetros de URL do "Limpar tudo": toda coluna filtrável mais a ordenação. */
export function buildClearAllPatch<T>(
  columns: readonly AdminTableColumn<T>[],
): Record<string, string | undefined> {
  const patch: Record<string, string | undefined> = {
    [TABLE_SORT_KEY_PARAM]: undefined,
    [TABLE_SORT_DIRECTION_PARAM]: undefined,
  }
  for (const column of columns) {
    if (column.filter) patch[column.key] = undefined
  }
  return patch
}
