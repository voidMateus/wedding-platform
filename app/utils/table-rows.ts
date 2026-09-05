import type { AdminTableColumn, TableSortDirection } from '~/types/table'

/**
 * Aplicação dos filtros por coluna quando a lista inteira já está no client.
 *
 * Só vale para tela que carrega tudo de uma vez (presentes, plataforma). Em
 * lista paginada o recorte é sempre do endpoint — filtrar aqui recortaria só a
 * página carregada, e o resultado descreveria uma lista diferente da que o
 * cabeçalho e a paginação anunciam.
 *
 * A página declara, por coluna, de onde sai o valor e como se compara: a tabela
 * não adivinha isso, porque quase toda coluna interessante é derivada (o status
 * de um presente vem das reservas, a categoria vem de outra requisição).
 */

export interface ClientColumn<T> {
  /**
   * Valor(es) da linha usados pelo filtro. Lista quando a linha pode casar por
   * mais de um valor (os vários presenteadores de um presente, por exemplo).
   */
  value?: (row: T) => string | readonly string[] | null | undefined
  /** Ordenação da coluna. Sem isto, declarar `sort` não faz nada. */
  compare?: (a: T, b: T) => number
}

export interface ClientTableState {
  values: Record<string, string[]>
  sortKey: string | null
  sortDirection: TableSortDirection
}

/**
 * Minúsculas e sem acento dos dois lados da comparação: quem digita "jose" no
 * filtro espera achar "José". Mesma tolerância que a busca de convidados já tem
 * no banco (`convidado_nome_corresponde`), aqui na versão do client.
 */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

function valuesOfRow<T>(row: T, accessor: ClientColumn<T> | undefined): string[] {
  const raw = accessor?.value?.(row)
  if (raw === null || raw === undefined) return []
  return (Array.isArray(raw) ? raw : [raw as string]).filter(Boolean)
}

function matchesColumn<T>(
  row: T,
  column: AdminTableColumn<T>,
  accessor: ClientColumn<T> | undefined,
  selected: string[],
): boolean {
  const rowValues = valuesOfRow(row, accessor)
  // Coluna filtrável sem acessor é erro de quem chamou, não linha que não casa —
  // esconder tudo em silêncio seria o pior desfecho, então não filtra.
  if (!accessor?.value) return true

  if (column.filter?.type === 'text') {
    const needle = normalize(selected[0] ?? '')
    return rowValues.some((value) => normalize(value).includes(needle))
  }
  // Lista fechada: casa por igualdade, e os valores marcados são alternativas
  // entre si (duas faixas etárias = uma OU outra). Entre colunas diferentes, o
  // recorte é sempre soma de condições.
  return rowValues.some((value) => selected.includes(value))
}

export function applyTableFilters<T>(
  rows: readonly T[],
  columns: readonly AdminTableColumn<T>[],
  accessors: Record<string, ClientColumn<T>>,
  state: ClientTableState,
): T[] {
  const active = columns.filter((column) => state.values[column.key]?.length)

  const filtered = active.length
    ? rows.filter((row) =>
        active.every((column) =>
          matchesColumn(row, column, accessors[column.key], state.values[column.key] ?? []),
        ),
      )
    : [...rows]

  const compare = state.sortKey ? accessors[state.sortKey]?.compare : undefined
  if (!compare) return filtered

  const direction = state.sortDirection === 'desc' ? -1 : 1
  return filtered.sort((a, b) => compare(a, b) * direction)
}

/** Comparações prontas — as duas que toda tabela repete. */
export const compareText =
  <T>(value: (row: T) => string | null | undefined) =>
  (a: T, b: T): number =>
    (value(a) ?? '').localeCompare(value(b) ?? '', 'pt-BR')

export const compareNumber =
  <T>(value: (row: T) => number | null | undefined) =>
  (a: T, b: T): number =>
    (value(a) ?? 0) - (value(b) ?? 0)
