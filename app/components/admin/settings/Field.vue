<!--
  Rótulo + controle + linha de apoio para controles COMPOSTOS — seletor de
  cor (swatch + campo hex), grade de presets, grupo de checkboxes. Campo
  simples não usa isto: UiInput/UiSelect/UiTextarea já desenham o próprio
  `label`/`hint` com o `for`/`aria-describedby` certos.

  role="group" + aria-labelledby, não <label>: um <label> só pode apontar
  para um controle, e aqui o rótulo descreve um conjunto deles.
-->
<script setup lang="ts">
interface Props {
  label: string
  hint?: string
}

defineProps<Props>()

const labelId = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5" role="group" :aria-labelledby="labelId">
    <span :id="labelId" class="text-sm font-medium text-text">{{ label }}</span>
    <slot />
    <p v-if="hint" class="text-xs leading-relaxed text-text-muted">{{ hint }}</p>
  </div>
</template>
