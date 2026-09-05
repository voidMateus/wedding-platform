<!--
  Painel de filtro de uma coluna: "Ordenar" (dois sentidos, rótulo conforme o
  tipo do dado) e "Filtrar" (texto ou lista fechada).

  É só o painel — quem o coloca dentro de um popover é `AdminTable` (cabeçalho,
  do `md` pra cima) e quem o empilha inline é `AdminTableFilterBar` (modal de
  filtros do celular, onde não existe cabeçalho de tabela pra ancorar popover).
  Por isso não há `PopoverContent` aqui dentro: o mesmo painel precisa servir
  aos dois contextos sem virar dois componentes que divergem com o tempo.
-->
<script setup lang="ts">
import type { TableColumnFilter, TableSortDirection, TableSortKind } from '~/types/table'

interface Props {
  label: string
  filter?: TableColumnFilter
  sort?: TableSortKind
  value: string
  direction: TableSortDirection | null
}

const { label, filter, sort, value, direction } = defineProps<Props>()

const emit = defineEmits<{
  'update:value': [value: string]
  sort: [direction: TableSortDirection]
  clear: []
}>()

const sortLabels = computed(() => (sort ? tableSortLabels(sort) : null))

const hasActive = computed(() => Boolean(value) || direction !== null)

// Lista de opções desenhada aqui dentro, e não um UiSelect: o dropdown do
// Reka é portalado pro `body`, então abri-lo dentro do popover do cabeçalho
// contaria como clique fora e fecharia o filtro na primeira interação. De
// quebra, escolher o recorte vira um clique em vez de dois.
//
// A opção vazia é o jeito de tirar o recorte pela própria lista (o "Limpar"
// do topo zera a coluna inteira, ordenação junto). Não é acrescentada quando a
// página já traz a sua — vários recortes têm nome próprio pro "todos"
// ("Todas as idades"), e duas linhas com o mesmo significado confundem.
const selectOptions = computed(() => {
  const options = filter?.options ?? []
  if (options.some((option) => option.value === '')) return [...options]
  return [{ value: '', label: 'Todos' }, ...options]
})

const draft = useDebouncedText(
  () => value,
  (next) => emit('update:value', next),
)
</script>

<template>
  <div class="flex w-full flex-col gap-3 sm:w-56">
    <div class="flex items-center justify-between gap-2">
      <span class="truncate text-xs font-semibold uppercase tracking-wide text-text-muted">
        {{ label }}
      </span>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!hasActive"
        @click="emit('clear')"
      >
        <Icon name="lucide:x" class="h-3 w-3" />
        Limpar
      </button>
    </div>

    <div v-if="sort && sortLabels" class="flex flex-col gap-0.5">
      <span class="px-1 text-[0.6875rem] uppercase tracking-wide text-text-muted">Ordenar</span>
      <button
        v-for="option in ['asc', 'desc'] as const"
        :key="option"
        type="button"
        class="flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          direction === option
            ? 'bg-surface-muted font-medium text-text'
            : 'text-text-muted hover:bg-surface-muted/60 hover:text-text'
        "
        :aria-pressed="direction === option"
        @click="emit('sort', option)"
      >
        <Icon
          :name="option === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
          class="h-3.5 w-3.5 shrink-0"
          :class="direction === option && 'text-primary'"
        />
        {{ sortLabels[option] }}
      </button>
    </div>

    <div v-if="filter" class="flex flex-col gap-1">
      <span class="px-1 text-[0.6875rem] uppercase tracking-wide text-text-muted">Filtrar</span>
      <div
        v-if="filter.type === 'select'"
        class="-mx-1 flex max-h-56 flex-col gap-0.5 overflow-y-auto px-1"
        role="group"
        :aria-label="`Filtrar por ${label}`"
      >
        <button
          v-for="option in selectOptions"
          :key="option.value"
          type="button"
          class="flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-left text-sm transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="
            value === option.value
              ? 'bg-surface-muted font-medium text-text'
              : 'text-text-muted hover:bg-surface-muted/60 hover:text-text'
          "
          :aria-pressed="value === option.value"
          @click="emit('update:value', option.value)"
        >
          <Icon
            name="lucide:check"
            class="h-3.5 w-3.5 shrink-0 text-primary"
            :class="value !== option.value && 'invisible'"
          />
          <span class="truncate">{{ option.label }}</span>
        </button>
      </div>
      <UiInput
        v-else
        v-model="draft"
        icon="lucide:search"
        :aria-label="`Filtrar por ${label}`"
        :placeholder="filter.placeholder ?? 'Pesquisar'"
      />
    </div>
  </div>
</template>
