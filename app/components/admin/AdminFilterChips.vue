<!--
  Barra de filtros em chip (32px) do cabeçalho dos painéis — e também o
  estilo das abas de Configurações, para que "trocar de recorte" tenha uma
  só linguagem visual em todo o admin.

  Não é UiChip: UiChip é a etiqueta arredondada (pill com borda, removível)
  usada em categorias/etiquetas de convite. Aqui é um seletor de recorte
  mutuamente exclusivo, retangular, sem borda, com estado por fundo.
-->
<script setup lang="ts">
export interface AdminFilterChip {
  value: string
  label: string
}

interface Props {
  items: readonly AdminFilterChip[]
  modelValue: string
  /**
   * Rótulo do grupo para leitor de tela (ex.: "Filtrar convidados por
   * status"). Não se chama `ariaLabel`: `aria-label` já é atributo nativo,
   * e o template resolveria o atributo em vez da prop.
   */
  groupLabel: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-1" role="group" :aria-label="groupLabel">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      :aria-pressed="item.value === modelValue"
      class="h-8 rounded-lg px-3 text-xs font-medium transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="
        item.value === modelValue
          ? 'bg-surface-muted text-text'
          : 'text-text-muted hover:bg-surface-muted/60 hover:text-text'
      "
      @click="emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
