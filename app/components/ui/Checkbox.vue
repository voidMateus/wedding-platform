<script setup lang="ts">
interface Props {
  modelValue?: boolean
  label?: string
  /**
   * Nome acessível quando a caixa não tem rótulo desenhado — mesmo contrato do
   * UiInput. Numa lista, o rótulo visível é o texto da própria linha ("Concluir
   * Contratar o buffet" dito por extenso ao lado de cada caixa seria ruído
   * visual), mas sem nome o leitor de tela anuncia só "caixa de seleção".
   */
  ariaLabel?: string
  disabled?: boolean
}

const { modelValue = false, label, ariaLabel, disabled = false } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const checkboxId = useId()
</script>

<template>
  <label
    :for="checkboxId"
    class="flex items-center gap-2 text-sm text-text"
    :class="disabled ? 'opacity-50' : 'cursor-pointer'"
  >
    <input
      :id="checkboxId"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="label ? undefined : ariaLabel"
      class="h-4 w-4 rounded border-border text-primary transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span v-if="label">{{ label }}</span>
  </label>
</template>
