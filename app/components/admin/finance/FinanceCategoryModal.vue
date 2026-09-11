<script setup lang="ts">
import type { BudgetCategoryInput } from '#shared/schemas/finance'
import type { CategoriaOrcamento } from '~/types/finance'

interface Props {
  modelValue: boolean
  categoria?: Pick<CategoriaOrcamento, 'id' | 'nome' | 'valor_previsto_centavos'> | null
}

const { modelValue, categoria = null } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  salvar: [input: BudgetCategoryInput]
}>()

const nome = ref('')
const valorPrevisto = ref<number | null>(null)
const erro = ref('')

const editando = computed(() => Boolean(categoria))

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    nome.value = categoria?.nome ?? ''
    valorPrevisto.value = categoria?.valor_previsto_centavos ?? null
  },
)

function submeter() {
  if (!nome.value.trim()) {
    erro.value = 'Informe um nome para a categoria.'
    return
  }

  emit('salvar', {
    nome: nome.value.trim(),
    valorPrevistoCentavos: valorPrevisto.value ?? 0,
    ordemExibicao: 0,
  })
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="editando ? 'Editar categoria' : 'Nova categoria'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <UiInput v-model="nome" label="Nome" placeholder="Decoração e flores" />
      <UiCurrencyInput
        v-model="valorPrevisto"
        label="Quanto pretendem gastar"
        :error="erro ?? undefined"
      />
      <p class="text-xs text-text-muted">
        O planejado é o teto que vocês imaginam para esta categoria — não precisa ser exato, e pode
        ficar em branco.
      </p>

      <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton @click="submeter">{{ editando ? 'Salvar' : 'Adicionar categoria' }}</UiButton>
    </template>
  </UiModal>
</template>
