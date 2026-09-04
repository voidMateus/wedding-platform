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
export interface AdminTableColumn<T> {
  key: string
  label: string
  align?: 'left' | 'right'
  /** Coluna de ações: rótulo só para leitor de tela, nunca desenhado. */
  labelHidden?: boolean
  /** Valor padrão da célula quando a página não passa o slot `cell-<key>`. */
  value?: (row: T) => string | number
}

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
}

const {
  columns,
  rows,
  emptyLabel = 'Nenhum registro com esses filtros.',
  isExpanded,
  rowClickable = false,
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
            >
              <span v-if="column.labelHidden" class="sr-only">{{ column.label }}</span>
              <template v-else>{{ column.label }}</template>
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
