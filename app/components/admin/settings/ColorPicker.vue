<!--
  Um campo de cor da paleta: swatch nativo + hexadecimal editável, com a
  leitura de contraste logo abaixo. Extraído porque a aba de Aparência tem
  quatro cores com exatamente o mesmo tratamento (primária, secundária,
  título, corpo) — antes eram quatro blocos copiados.

  O contraste é conferido aqui só como prévia; quem barra de fato um valor
  reprovado é o schema Zod no servidor (CLAUDE.md, seção 13).
-->
<script setup lang="ts">
import { WCAG_AA_MIN_CONTRAST, checkColorContrast, isValidHexColor } from '#shared/utils/contrast'

interface Props {
  modelValue: string | undefined
  label: string
  error?: string
}

const { modelValue, label, error } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const contrast = computed(() => {
  if (!modelValue || !isValidHexColor(modelValue)) return null
  return checkColorContrast(modelValue)
})

const swatchId = useId()
</script>

<template>
  <div class="flex flex-1 flex-col gap-1.5">
    <label :for="swatchId" class="text-sm font-medium text-text">{{ label }}</label>
    <div class="flex items-start gap-2">
      <input
        :id="swatchId"
        type="color"
        :value="modelValue ?? ''"
        class="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <UiInput
        :model-value="modelValue"
        :aria-label="`${label} (hexadecimal)`"
        class="min-w-0 flex-1"
        :error="error"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
    <p
      v-if="contrast"
      class="text-xs"
      :class="contrast.meetsMinimum ? 'text-success' : 'text-danger'"
    >
      Contraste {{ contrast.ratioAgainstSurface.toFixed(2) }}:1 · mínimo
      {{ WCAG_AA_MIN_CONTRAST }}:1 — {{ contrast.meetsMinimum ? 'ok' : 'insuficiente' }}
    </p>
  </div>
</template>
