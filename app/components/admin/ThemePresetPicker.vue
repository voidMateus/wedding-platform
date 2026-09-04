<script setup lang="ts">
import { THEME_PRESETS } from '#shared/theme-presets'

interface Props {
  modelValue: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [presetId: string]
}>()
</script>

<!--
  Só a grade de presets: o rótulo e a explicação vêm do AdminSettingsField
  que envolve o componente na aba de Aparência — mesma divisão de UiInput
  (controle) e Field (rótulo/apoio), para os campos da tela não terem dois
  padrões de rotulagem concorrentes.
-->
<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <button
      v-for="preset in THEME_PRESETS"
      :key="preset.id"
      type="button"
      class="flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors"
      :class="
        props.modelValue === preset.id
          ? 'border-primary ring-2 ring-primary ring-offset-1'
          : 'border-border hover:border-primary/50'
      "
      @click="emit('update:modelValue', preset.id)"
    >
      <span class="flex gap-1">
        <span
          class="h-6 w-6 rounded-full border border-border"
          :style="{ backgroundColor: preset.primaryColor }"
        />
        <span
          class="h-6 w-6 rounded-full border border-border"
          :style="{ backgroundColor: preset.secondaryColor }"
        />
      </span>
      <span class="text-sm font-medium text-text">{{ preset.label }}</span>
    </button>
  </div>
</template>
