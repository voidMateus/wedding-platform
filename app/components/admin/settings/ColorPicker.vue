<!--
  Um campo de cor da paleta: o seletor (UiColorPicker) mais a leitura de
  contraste (AdminSettingsContrastHint) logo abaixo. Extraído porque a aba de
  Aparência tem quatro cores com exatamente o mesmo tratamento (primária,
  secundária, título, corpo) — antes eram quatro blocos copiados.

  O contraste é conferido aqui só como prévia; quem barra de fato um valor
  reprovado é o schema Zod no servidor (CLAUDE.md, seção 13).
-->
<script setup lang="ts">
import { THEME_PRESETS } from '#shared/theme-presets'
import { checkColorContrast, isValidHexColor } from '#shared/utils/contrast'

interface Props {
  modelValue: string | undefined
  label: string
  error?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/**
 * Sugestões do seletor: as cores dos presets de tema. São paletas que já
 * passaram no contraste, então servem de ponto de partida seguro — em vez de
 * uma grade de cores genéricas sem relação com o produto.
 */
const suggestions = computed(() => [
  ...new Set(THEME_PRESETS.flatMap((preset) => [preset.primaryColor, preset.secondaryColor])),
])

/**
 * Quando a cor é um hexadecimal válido mas reprova no contraste, o aviso
 * abaixo já explica o problema e oferece o tom corrigido — mostrar também o
 * erro do campo repetia a MESMA frase duas vezes, uma em vermelho e outra no
 * painel, empilhadas. O erro do campo continua aparecendo para o outro caso
 * de validação (formato inválido), que o aviso não cobre.
 */
const contrastAlreadyExplained = computed(() => {
  const value = props.modelValue
  if (!value || !isValidHexColor(value)) return false
  return !checkColorContrast(value).meetsMinimum
})

const fieldError = computed(() => (contrastAlreadyExplained.value ? undefined : props.error))
</script>

<template>
  <div class="flex flex-1 flex-col gap-2">
    <UiColorPicker
      :model-value="modelValue"
      :label="label"
      :error="fieldError"
      :suggestions="suggestions"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <AdminSettingsContrastHint :color="modelValue" @apply="emit('update:modelValue', $event)" />
  </div>
</template>
