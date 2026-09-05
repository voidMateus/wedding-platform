<!--
  Painel de filtro de uma coluna: "Ordenar" (dois sentidos, rótulo conforme o
  tipo do dado) e "Filtrar" (texto ou lista de opções).

  É só o painel — quem o coloca dentro de um popover é `AdminTable` (cabeçalho,
  do `md` pra cima) e quem o empilha inline é `AdminTableFilterBar` (modal de
  filtros do celular, onde não existe cabeçalho de tabela pra ancorar popover).
  Por isso não há `PopoverContent` aqui dentro: o mesmo painel precisa servir
  aos dois contextos sem virar dois componentes que divergem com o tempo.

  O painel não sabe se a coluna aceita uma ou várias opções: ele avisa qual foi
  clicada (`select`) e quem decide o efeito é `useTableFilters`, que conhece o
  `multiple` da coluna. A marca visual (quadrado x círculo) é só reflexo do
  mesmo `multiple`, para quem lê saber se pode marcar mais de uma.
-->
<script setup lang="ts">
import type { TableColumnFilter, TableSortDirection, TableSortKind } from '~/types/table'

interface Props {
  label: string
  filter?: TableColumnFilter
  sort?: TableSortKind
  /** Valores marcados — lista de zero ou um quando a coluna é de valor único. */
  values: readonly string[]
  direction: TableSortDirection | null
}

const { label, filter, sort, values, direction } = defineProps<Props>()

const emit = defineEmits<{
  /** Opção clicada na lista — marcar, desmarcar ou limpar é decisão de quem escuta. */
  select: [value: string]
  'update:text': [value: string]
  sort: [direction: TableSortDirection]
  clear: []
}>()

const sortLabels = computed(() => (sort ? tableSortLabels(sort) : null))

const hasActive = computed(() => values.length > 0 || direction !== null)

// Lista de opções desenhada aqui dentro, e não um UiSelect: o dropdown do Reka
// é portalado pro `body`, então abri-lo dentro do popover do cabeçalho contaria
// como clique fora e fecharia o filtro na primeira interação. De quebra,
// escolher o recorte vira um clique em vez de dois.
//
// Valor único: a opção vazia é o "sem recorte" e entra na lista (a não ser que
// a página já traga a sua, com nome próprio — "Todas as idades"; duas linhas
// com o mesmo significado confundem).
//
// Múltipla escolha: a opção vazia sai. Ali cada linha é uma caixa de marcar, e
// "Todos" no meio delas seria uma caixa que desmarca as outras — quem tira o
// recorte é o "Limpar" do topo, que já existe e vale para a coluna inteira.
const selectOptions = computed(() => {
  const options = filter?.options ?? []
  if (filter?.multiple) return options.filter((option) => option.value !== '')
  if (options.some((option) => option.value === '')) return [...options]
  return [{ value: '', label: 'Todos' }, ...options]
})

function isChecked(value: string): boolean {
  return value ? values.includes(value) : values.length === 0
}

const draft = useDebouncedText(
  () => values[0] ?? '',
  (next) => emit('update:text', next),
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
      <span class="px-1 text-xs uppercase tracking-wide text-text-muted">Ordenar</span>
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
      <!-- Sem "pode marcar mais de um" escrito: a caixa de marcar já diz isso
           sozinha, e o aviso em versalete quebrava o rótulo em duas linhas. -->
      <span class="px-1 text-xs uppercase tracking-wide text-text-muted">Filtrar</span>

      <!-- Múltipla escolha é caixa de marcar de verdade (UiCheckbox, input
           nativo): o leitor de tela anuncia "caixa de seleção, marcada" e a
           barra de espaço funciona sozinha. Valor único continua sendo lista de
           opções, onde marcar uma desmarca a anterior. -->
      <div
        v-if="filter.type === 'select'"
        class="-mx-1 flex max-h-56 flex-col gap-0.5 overflow-y-auto px-1"
        role="group"
        :aria-label="`Filtrar por ${label}`"
      >
        <template v-if="filter.multiple">
          <UiCheckbox
            v-for="option in selectOptions"
            :key="option.value"
            :model-value="isChecked(option.value)"
            :label="option.label"
            class="h-8 shrink-0 rounded-md px-2 transition-brand hover:bg-surface-muted/60"
            @update:model-value="emit('select', option.value)"
          />
        </template>
        <button
          v-for="option in selectOptions"
          v-else
          :key="option.value"
          type="button"
          class="flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-left text-sm transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="
            isChecked(option.value)
              ? 'bg-surface-muted font-medium text-text'
              : 'text-text-muted hover:bg-surface-muted/60 hover:text-text'
          "
          :aria-pressed="isChecked(option.value)"
          @click="emit('select', option.value)"
        >
          <Icon
            name="lucide:check"
            class="h-3.5 w-3.5 shrink-0 text-primary"
            :class="!isChecked(option.value) && 'invisible'"
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
