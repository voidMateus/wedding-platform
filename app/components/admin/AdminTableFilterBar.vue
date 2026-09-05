<!--
  A contraparte visível dos filtros por coluna: mostra o que está aplicado e
  dá o caminho de volta.

  Existe por duas razões, e nenhuma delas é decoração:

  1. Filtro escondido dentro do cabeçalho é filtro invisível — quem filtra,
     esquece e volta depois acha que sumiu convidado. Cada recorte ativo vira
     um chip removível, com "Limpar tudo" ao lado.
  2. Abaixo de `md` a AdminTable vira lista de blocos empilhados e não existe
     `<thead>` (por desenho) — sem este botão "Filtros" e o modal que ele abre,
     o recurso simplesmente não existiria no celular.
-->
<script setup lang="ts" generic="Row">
import type { TableFiltersApi } from '~/composables/useTableFilters'
import type { AdminTableColumn } from '~/types/table'

interface Props {
  columns: readonly AdminTableColumn<Row>[]
  filters: TableFiltersApi
  /** Nome do grupo para leitor de tela (ex.: "Filtros de convidados"). */
  groupLabel: string
}

const { columns, filters, groupLabel } = defineProps<Props>()

const isModalOpen = ref(false)

const filterableColumns = computed(() => columns.filter((column) => column.filter || column.sort))
const activeFilters = computed(() => filters.activeFilters.value)
const hasActive = computed(() => filters.hasActive.value)
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-2" role="group" :aria-label="groupLabel">
    <!-- Um chip por valor marcado: com duas faixas etárias no recorte, tirar
         uma não pode derrubar a outra. -->
    <UiChip
      v-for="filter in activeFilters"
      :key="`${filter.key}:${filter.value}`"
      :label="`${filter.columnLabel}: ${filter.valueLabel}`"
      removable
      @remove="filters.clearValue(filter.key, filter.value)"
    />

    <button
      v-if="hasActive"
      type="button"
      class="h-8 rounded-lg px-2.5 text-xs font-medium text-text-muted transition-brand hover:bg-surface-muted/60 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      @click="filters.clearAll()"
    >
      Limpar tudo
    </button>

    <!-- md:hidden: do `md` pra cima o caminho é o menu do próprio cabeçalho. -->
    <button
      type="button"
      class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-text-muted transition-brand hover:bg-surface-muted/60 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
      @click="isModalOpen = true"
    >
      <Icon name="lucide:sliders-horizontal" class="h-3.5 w-3.5" />
      Filtros
      <span v-if="activeFilters.length" class="text-primary">({{ activeFilters.length }})</span>
    </button>

    <UiModal v-model="isModalOpen" title="Filtros">
      <div class="flex flex-col divide-y divide-border">
        <div
          v-for="column in filterableColumns"
          :key="column.key"
          class="py-4 first:pt-0 last:pb-0"
        >
          <AdminColumnFilter
            :label="column.label"
            :filter="column.filter"
            :sort="column.sort"
            :values="filters.valuesOf(column.key)"
            :direction="filters.sortOf(column.key)"
            @select="filters.toggleValue(column.key, $event)"
            @update:text="filters.setText(column.key, $event)"
            @sort="filters.setSort(column.key, $event)"
            @clear="filters.clearColumn(column.key)"
          />
        </div>
      </div>

      <template #footer>
        <UiButton variant="ghost" :disabled="!hasActive" @click="filters.clearAll()">
          Limpar tudo
        </UiButton>
        <UiButton @click="isModalOpen = false">Ver resultados</UiButton>
      </template>
    </UiModal>
  </div>
</template>
