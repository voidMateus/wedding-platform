<script setup lang="ts">
import { FONT_PAIRS } from '#shared/theme-presets'

interface Props {
  modelValue?: string
  sampleText?: string
}

const props = withDefaults(defineProps<Props>(), { sampleText: 'Ana & João' })

const emit = defineEmits<{
  'update:modelValue': [fontPairId: string]
}>()
</script>

<!-- Rótulo/explicação vêm do AdminSettingsField do chamador — ver ThemePresetPicker. -->
<template>
  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <button
      v-for="pair in FONT_PAIRS"
      :key="pair.id"
      type="button"
      class="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors"
      :class="
        props.modelValue === pair.id
          ? 'border-primary ring-2 ring-primary ring-offset-1'
          : 'border-border hover:border-primary/50'
      "
      @click="emit('update:modelValue', pair.id)"
    >
      <span class="text-lg" :style="{ fontFamily: pair.displayFontFamily }">
        {{ props.sampleText }}
      </span>
      <span class="text-xs text-text-muted">{{ pair.label }}</span>
    </button>
  </div>
</template>
