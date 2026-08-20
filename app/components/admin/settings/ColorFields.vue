<script setup lang="ts">
import { WCAG_AA_MIN_CONTRAST, checkColorContrast, isValidHexColor } from '#shared/utils/contrast'

interface Props {
  primaryColor: string | undefined
  secondaryColor: string | undefined
  titleColor: string | undefined
  bodyColor: string | undefined
  advancedColorEnabled: boolean
  primaryError?: string
  secondaryError?: string
  titleError?: string
  bodyError?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:primaryColor': [value: string]
  'update:secondaryColor': [value: string]
  'update:titleColor': [value: string]
  'update:bodyColor': [value: string]
  'update:advancedColorEnabled': [value: boolean]
}>()

const primaryContrastPreview = computed(() => {
  if (!props.primaryColor || !isValidHexColor(props.primaryColor)) return null
  return checkColorContrast(props.primaryColor)
})
const secondaryContrastPreview = computed(() => {
  if (!props.secondaryColor || !isValidHexColor(props.secondaryColor)) return null
  return checkColorContrast(props.secondaryColor)
})
const titleContrastPreview = computed(() => {
  if (!props.titleColor || !isValidHexColor(props.titleColor)) return null
  return checkColorContrast(props.titleColor)
})
const bodyContrastPreview = computed(() => {
  if (!props.bodyColor || !isValidHexColor(props.bodyColor)) return null
  return checkColorContrast(props.bodyColor)
})

function setAdvancedColorEnabled(enabled: boolean) {
  emit('update:advancedColorEnabled', enabled)
  // Personalização avançada é opcional mesmo ligada (CLAUDE.md §22.3) — mas
  // desligar o toggle limpa os campos, em vez de deixar um valor escondido
  // e não-editável salvo por engano.
  if (!enabled) {
    emit('update:titleColor', '')
    emit('update:bodyColor', '')
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-4 sm:flex-row">
      <div class="flex flex-1 flex-col gap-1">
        <label class="text-sm font-medium text-text" for="primary-color">Cor primária</label>
        <div class="flex items-center gap-3">
          <input
            id="primary-color"
            :value="primaryColor ?? ''"
            type="color"
            class="h-10 w-14 cursor-pointer rounded-md border border-border"
            @input="$emit('update:primaryColor', ($event.target as HTMLInputElement).value)"
          />
          <UiInput
            :model-value="primaryColor"
            class="flex-1"
            :error="primaryError"
            @update:model-value="$emit('update:primaryColor', $event)"
          />
        </div>
        <p
          v-if="primaryContrastPreview"
          class="text-xs"
          :class="primaryContrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
        >
          Contraste: {{ primaryContrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
          {{ WCAG_AA_MIN_CONTRAST }}:1 —
          {{ primaryContrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
        </p>
      </div>

      <div class="flex flex-1 flex-col gap-1">
        <label class="text-sm font-medium text-text" for="secondary-color">Cor secundária</label>
        <div class="flex items-center gap-3">
          <input
            id="secondary-color"
            :value="secondaryColor ?? ''"
            type="color"
            class="h-10 w-14 cursor-pointer rounded-md border border-border"
            @input="$emit('update:secondaryColor', ($event.target as HTMLInputElement).value)"
          />
          <UiInput
            :model-value="secondaryColor"
            class="flex-1"
            :error="secondaryError"
            @update:model-value="$emit('update:secondaryColor', $event)"
          />
        </div>
        <p
          v-if="secondaryContrastPreview"
          class="text-xs"
          :class="secondaryContrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
        >
          Contraste: {{ secondaryContrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
          {{ WCAG_AA_MIN_CONTRAST }}:1 —
          {{ secondaryContrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-3 rounded-lg border border-border p-4">
      <UiCheckbox
        :model-value="advancedColorEnabled"
        label="Personalização avançada (cor de título e de corpo de texto)"
        @update:model-value="setAdvancedColorEnabled"
      />
      <p class="text-xs text-text-muted">
        Opcional — sem isso, títulos e textos usam a cor neutra padrão da plataforma. Cada cor
        continua validada por contraste, como a primária e a secundária.
      </p>

      <div v-if="advancedColorEnabled" class="flex flex-col gap-4 sm:flex-row">
        <div class="flex flex-1 flex-col gap-1">
          <label class="text-sm font-medium text-text" for="title-color">Cor de título</label>
          <div class="flex items-center gap-3">
            <input
              id="title-color"
              :value="titleColor ?? ''"
              type="color"
              class="h-10 w-14 cursor-pointer rounded-md border border-border"
              @input="$emit('update:titleColor', ($event.target as HTMLInputElement).value)"
            />
            <UiInput
              :model-value="titleColor"
              class="flex-1"
              :error="titleError"
              @update:model-value="$emit('update:titleColor', $event)"
            />
          </div>
          <p
            v-if="titleContrastPreview"
            class="text-xs"
            :class="titleContrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
          >
            Contraste: {{ titleContrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
            {{ WCAG_AA_MIN_CONTRAST }}:1 —
            {{ titleContrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
          </p>
        </div>

        <div class="flex flex-1 flex-col gap-1">
          <label class="text-sm font-medium text-text" for="body-color"
            >Cor de corpo de texto</label
          >
          <div class="flex items-center gap-3">
            <input
              id="body-color"
              :value="bodyColor ?? ''"
              type="color"
              class="h-10 w-14 cursor-pointer rounded-md border border-border"
              @input="$emit('update:bodyColor', ($event.target as HTMLInputElement).value)"
            />
            <UiInput
              :model-value="bodyColor"
              class="flex-1"
              :error="bodyError"
              @update:model-value="$emit('update:bodyColor', $event)"
            />
          </div>
          <p
            v-if="bodyContrastPreview"
            class="text-xs"
            :class="bodyContrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
          >
            Contraste: {{ bodyContrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
            {{ WCAG_AA_MIN_CONTRAST }}:1 —
            {{ bodyContrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
