<script setup lang="ts">
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

defineProps<Props>()

const emit = defineEmits<{
  'update:primaryColor': [value: string]
  'update:secondaryColor': [value: string]
  'update:titleColor': [value: string]
  'update:bodyColor': [value: string]
  'update:advancedColorEnabled': [value: boolean]
}>()

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
      <AdminSettingsColorPicker
        :model-value="primaryColor"
        label="Cor primária"
        :error="primaryError"
        @update:model-value="emit('update:primaryColor', $event)"
      />
      <AdminSettingsColorPicker
        :model-value="secondaryColor"
        label="Cor secundária"
        :error="secondaryError"
        @update:model-value="emit('update:secondaryColor', $event)"
      />
    </div>

    <AdminSettingsToggleRow
      :model-value="advancedColorEnabled"
      label="Personalização avançada"
      hint="Define a cor de título e de corpo de texto. Sem isso, os dois usam a cor neutra padrão da plataforma — e cada cor escolhida continua validada por contraste."
      @update:model-value="setAdvancedColorEnabled"
    />

    <div v-if="advancedColorEnabled" class="flex flex-col gap-4 sm:flex-row">
      <AdminSettingsColorPicker
        :model-value="titleColor"
        label="Cor de título"
        :error="titleError"
        @update:model-value="emit('update:titleColor', $event)"
      />
      <AdminSettingsColorPicker
        :model-value="bodyColor"
        label="Cor de corpo de texto"
        :error="bodyError"
        @update:model-value="emit('update:bodyColor', $event)"
      />
    </div>
  </div>
</template>
