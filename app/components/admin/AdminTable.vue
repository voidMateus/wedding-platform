<!--
  Tabela densa da direção "livro de registro": linha de ~48px, divisores de
  1px, números tabulares e hover que desloca a linha 2px (.ledger-row) em vez
  de trocar de cor agressivamente.

  Abaixo de `md` a mesma marcação vira lista de blocos empilhados (rótulo à
  esquerda, valor à direita) via display — sem duplicar DOM e sem scroll
  horizontal. Por isso os rótulos de coluna vivem em `columns` e não em
  <th> escritos à mão: a versão empilhada precisa do mesmo rótulo dentro de
  cada célula.

  Não substitui UiTable (casca fina usada pelas telas ainda não migradas) —
  quando todas as listas do admin estiverem aqui, UiTable sai.
-->
<script setup lang="ts" generic="Row extends { id: string }">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import type { TableFiltersApi } from '~/composables/useTableFilters'
import type { AdminTableColumn, TableSortDirection } from '~/types/table'

interface Props {
  /**
   * Colunas declaradas pela página, nunca fixas no componente: quando um
   * dado novo passar a existir na API (ex.: status de RSVP na listagem de
   * convidados), a coluna entra na lista sem refazer a tela.
   */
  columns: readonly AdminTableColumn<Row>[]
  rows: readonly Row[]
  /** Texto curto do estado vazio, dentro do painel — nunca ilustração grande. */
  emptyLabel?: string
  /**
   * Quando devolve true, a linha ganha uma segunda linha logo abaixo com o
   * conteúdo do slot `detail` (ex.: nomes dos acompanhantes de um núcleo).
   * É o próprio predicado que controla a existência da linha — nunca uma
   * <tr> vazia por linha, que somaria um divisor fantasma em cada uma.
   */
  isExpanded?: (row: Row) => boolean
  /**
   * Torna a linha inteira uma área de clique (emite `row-click`). É só
   * conveniência de mouse: o alvo acessível continua sendo o controle dentro
   * da célula (nome clicável, ícone de ação), porque uma `<tr>` não é
   * focável nem anunciada como botão.
   */
  rowClickable?: boolean
  /**
   * Estado dos filtros por coluna (`useTableFilters`). Com ele, as colunas que
   * declaram `filter`/`sort` ganham o menu no próprio cabeçalho; sem ele a
   * tabela desenha exatamente como antes. O menu só existe do `md` pra cima,
   * onde há cabeçalho: no empilhado quem abre os filtros é
   * `AdminTableFilterBar`, com o mesmo painel dentro de um modal.
   */
  filters?: TableFiltersApi
}

const {
  columns,
  rows,
  emptyLabel = 'Nenhum registro com esses filtros.',
  isExpanded,
  rowClickable = false,
  filters,
} = defineProps<Props>()

const emit = defineEmits<{
  'row-click': [row: Row]
}>()

// Uma célula por coluna declarada (`cell-<key>`) — nome dinâmico, então o
// tipo é declarado aqui para a página receber `row` já tipado no template.
defineSlots<Record<string, (props: { row: Row }) => unknown>>()

function hasDetail(row: Row): boolean {
  return isExpanded ? isExpanded(row) : false
}

function handleRowClick(row: Row, event: MouseEvent): void {
  if (!rowClickable) return
  // Clique num controle da linha (excluir, expandir acompanhantes, link) é
  // dele, não da linha — senão o ícone de excluir abriria também o detalhe.
  const target = event.target as HTMLElement | null
  if (target?.closest('a, button, input, select, textarea, label, [role="button"]')) return
  emit('row-click', row)
}

function headClass(column: AdminTableColumn<Row>): string {
  return column.align === 'right' ? 'text-right' : ''
}

// Coluna sem `filter` nem `sort` declarados não abre menu nenhum — é assim que
// a tabela evita oferecer um recorte que o endpoint não sabe fazer.
function isFilterable(column: AdminTableColumn<Row>): boolean {
  return Boolean(filters) && Boolean(column.filter || column.sort)
}

function filterValuesOf(column: AdminTableColumn<Row>): string[] {
  return filters?.valuesOf(column.key) ?? []
}

function sortDirectionOf(column: AdminTableColumn<Row>): TableSortDirection | null {
  return filters?.sortOf(column.key) ?? null
}

function ariaSort(column: AdminTableColumn<Row>): 'ascending' | 'descending' | 'none' | undefined {
  if (!isFilterable(column) || !column.sort) return undefined
  const direction = sortDirectionOf(column)
  if (!direction) return 'none'
  return direction === 'asc' ? 'ascending' : 'descending'
}

// O sentido da ordenação vale mais que o funil na hora de bater o olho: é o
// que explica por que a lista está nessa ordem. Só quando não há ordenação o
// ícone volta a falar do filtro.
function triggerIcon(column: AdminTableColumn<Row>): string {
  const direction = sortDirectionOf(column)
  if (direction === 'asc') return 'lucide:arrow-up'
  if (direction === 'desc') return 'lucide:arrow-down'
  if (filterValuesOf(column).length) return 'lucide:filter'
  return 'lucide:chevron-down'
}

// Vale só para a versão empilhada (rótulo à esquerda, valor à direita). No
// desktop o alinhamento por coluna tem que estar na <td>, não aqui: o span é
// inline dentro de um table-cell, e text-align não posiciona elemento inline
// — era por isso que a coluna à direita não batia com o próprio <th>.
const STACKED_VALUE_CLASS = 'text-right md:text-left'
</script>

<template>
  <div class="overflow-hidden">
    <div class="md:overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="hidden border-b border-border bg-surface-muted/50 md:table-header-group">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted"
              :class="headClass(column)"
              :aria-sort="ariaSort(column)"
            >
              <span v-if="column.labelHidden" class="sr-only">{{ column.label }}</span>
              <span v-else class="inline-flex items-center gap-1">
                {{ column.label }}
                <PopoverRoot v-if="isFilterable(column)">
                  <PopoverTrigger
                    :aria-label="`Filtrar e ordenar por ${column.label}`"
                    class="rounded p-0.5 transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    :class="
                      filters?.isActive(column.key)
                        ? 'text-primary'
                        : 'text-text-muted/70 hover:text-text'
                    "
                  >
                    <Icon :name="triggerIcon(column)" class="h-3.5 w-3.5" />
                  </PopoverTrigger>
                  <!-- z-60 pelo mesmo motivo de UiSelect/UiColorPicker: listas
                       do admin também aparecem dentro de modal (z-50). -->
                  <PopoverPortal>
                    <PopoverContent
                      align="start"
                      :side-offset="6"
                      class="z-60 rounded-lg border border-border bg-surface-elevated p-3 text-left normal-case shadow-lg"
                    >
                      <AdminColumnFilter
                        :label="column.label"
                        :filter="column.filter"
                        :sort="column.sort"
                        :values="filterValuesOf(column)"
                        :direction="sortDirectionOf(column)"
                        @select="filters?.toggleValue(column.key, $event)"
                        @update:text="filters?.setText(column.key, $event)"
                        @sort="filters?.setSort(column.key, $event)"
                        @clear="filters?.clearColumn(column.key)"
                      />
                    </PopoverContent>
                  </PopoverPortal>
                </PopoverRoot>
              </span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <template v-for="row in rows" :key="row.id">
            <tr
              class="ledger-row block px-4 py-3 md:table-row md:px-0 md:py-0"
              :class="rowClickable && 'cursor-pointer'"
              @click="handleRowClick(row, $event)"
            >
              <td
                v-for="column in columns"
                :key="column.key"
                class="flex items-baseline justify-between gap-4 py-1 text-text md:table-cell md:px-4 md:py-3.5 md:align-middle"
                :class="column.align === 'right' && 'md:text-right'"
              >
                <span
                  v-if="!column.labelHidden"
                  class="shrink-0 text-xs uppercase tracking-wide text-text-muted md:hidden"
                >
                  {{ column.label }}
                </span>
                <!-- ml-auto quando não há rótulo (coluna de ações): a célula é
                     flex no empilhado e, com um único filho, ele encostaria à
                     esquerda. Inline no desktop, onde margem auto não se
                     aplica — não afeta a tabela. -->
                <span
                  class="min-w-0"
                  :class="[STACKED_VALUE_CLASS, column.labelHidden && 'ml-auto']"
                >
                  <slot :name="`cell-${column.key}`" :row="row">
                    {{ column.value ? column.value(row) : '—' }}
                  </slot>
                </span>
              </td>
            </tr>
            <tr v-if="hasDetail(row)" class="block bg-surface-muted/40 md:table-row">
              <td :colspan="columns.length" class="block px-4 py-3 md:table-cell">
                <slot name="detail" :row="row" />
              </td>
            </tr>
          </template>
          <tr v-if="!rows.length">
            <td :colspan="columns.length" class="px-5 py-10 text-center text-sm text-text-muted">
              {{ emptyLabel }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
