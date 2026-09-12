<!--
  Gerenciar categorias.

  A categoria deixou de ser um nível da navegação — ela é ATRIBUTO do gasto (um
  rótulo e uma cor), e por isso virou filtro na lista, não mais um bloco que
  envolve linhas. O que restou dela é administração: criar, renomear, definir
  teto, arquivar. Isso acontece algumas vezes por casamento, não toda semana,
  então mora atrás de uma porta em vez de ocupar a tela todo dia.

  O teto da categoria vive aqui pelo mesmo motivo: ele é guarda-corpo, e só
  precisa aparecer quando é ultrapassado.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { CategoriaComDespesas } from '~/types/finance'

interface Props {
  modelValue: boolean
  categorias: readonly CategoriaComDespesas[]
  arquivadas: readonly { id: string; nome: string }[]
}

const { modelValue, categorias, arquivadas } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  adicionar: []
  editar: [id: string]
  arquivar: [id: string]
  restaurar: [id: string]
}>()

const { corDaCategoria } = useCategoriaCores()

/** "Sem categoria" não é uma linha do banco: não se renomeia nem se arquiva. */
const reais = computed(() => categorias.filter((categoria) => categoria.categoriaId !== null))
</script>

<template>
  <UiModal
    :model-value="modelValue"
    size="lg"
    title="Categorias"
    description="O rótulo e a cor de cada gasto. O teto é opcional — serve para avisar quando uma categoria passa do que vocês reservaram."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <ul v-if="reais.length > 0" class="flex flex-col divide-y divide-border">
        <li
          v-for="categoria in reais"
          :key="categoria.categoriaId ?? ''"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
        >
          <span
            aria-hidden="true"
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :style="{
              backgroundColor: corDaCategoria(categoria.corIndice, categoria.corPersonalizada)
                .solida,
            }"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-text">{{ categoria.nome }}</p>
            <p class="num text-xs text-text-muted">
              {{ categoria.despesas.length }}
              {{ categoria.despesas.length === 1 ? 'gasto' : 'gastos' }}
              <template v-if="categoria.orcado > 0">
                · teto {{ formatCentsToBRL(categoria.orcado) }}
              </template>
            </p>
          </div>

          <UiBadge v-if="categoria.acimaDoOrcado > 0" tone="danger">
            {{ formatCentsToBRL(categoria.acimaDoOrcado) }} acima
          </UiBadge>

          <div class="flex items-center gap-1">
            <AdminRowAction
              icon="lucide:pencil"
              :label="`Editar categoria ${categoria.nome}`"
              @click="emit('editar', categoria.categoriaId ?? '')"
            />
            <AdminRowAction
              icon="lucide:archive"
              :label="`Arquivar categoria ${categoria.nome}`"
              @click="emit('arquivar', categoria.categoriaId ?? '')"
            />
          </div>
        </li>
      </ul>

      <p v-else class="text-sm text-text-muted">Nenhuma categoria criada ainda.</p>

      <AdminArchivedList
        v-if="arquivadas.length > 0"
        :itens="arquivadas.map((item) => ({ id: item.id, nome: item.nome, detalhe: null }))"
        singular="categoria arquivada"
        plural="categorias arquivadas"
        @restaurar="emit('restaurar', $event)"
      />
    </div>

    <template #footer>
      <UiButton @click="emit('adicionar')">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar categoria
      </UiButton>
    </template>
  </UiModal>
</template>
