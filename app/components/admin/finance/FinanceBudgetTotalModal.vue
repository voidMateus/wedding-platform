<!--
  Teto global do casamento. Nulo é estado normal, então o modal sempre oferece
  "remover o teto" — não é um campo obrigatório disfarçado.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'

interface Props {
  modelValue: boolean
  tetoCentavos: number | null
  planejadoCentavos: number
}

const { modelValue, tetoCentavos, planejadoCentavos } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  salvar: [valor: number | null]
}>()

const valor = ref<number | null>(tetoCentavos)
const salvando = ref(false)

watch(
  () => modelValue,
  (aberto) => {
    if (aberto) valor.value = tetoCentavos
  },
)

async function salvar(novoValor: number | null) {
  salvando.value = true
  try {
    emit('salvar', novoValor)
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Orçamento total"
    description="Quanto vocês têm para gastar no casamento inteiro. É separado do que você distribui por categoria — a diferença entre os dois é o que ainda não tem destino."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="salvar(valor)">
      <UiCurrencyInput v-model="valor" label="Orçamento total" />

      <p v-if="planejadoCentavos > 0" class="text-sm text-text-muted">
        Você já distribuiu {{ formatCentsToBRL(planejadoCentavos) }} entre as categorias.
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <UiButton
          v-if="tetoCentavos !== null"
          variant="ghost"
          :disabled="salvando"
          @click="salvar(null)"
        >
          Remover teto
        </UiButton>
        <UiButton variant="outline" :disabled="salvando" @click="emit('update:modelValue', false)">
          Cancelar
        </UiButton>
        <UiButton type="submit" :disabled="salvando">Salvar</UiButton>
      </div>
    </form>
  </UiModal>
</template>
