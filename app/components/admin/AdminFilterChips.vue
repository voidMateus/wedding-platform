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
  /**
   * 'chip' (default) é o recorte discreto do cabeçalho de painel — some no
   * fundo até ser procurado, que é o certo para um filtro secundário.
   *
   * 'segmented' é a mesma escolha promovida a controle principal, na moldura
   * de largura cheia de `UiTabs variant="segmented"`: usado quando escolher
   * o recorte É a tarefa da tela (os modelos prontos do gerador de planilha),
   * e não um ajuste sobre uma lista que já está lá.
   */
  variant?: 'chip' | 'segmented'
}

const { variant = 'chip' } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const GROUP_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  chip: 'flex flex-wrap gap-1',
  segmented: 'flex w-full gap-1 rounded-lg border border-border bg-surface-elevated p-1',
}

const ITEM_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  chip: 'h-8 rounded-lg px-3 text-xs font-medium',
  segmented: 'flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium',
}

const ACTIVE_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  chip: 'bg-surface-muted text-text',
  segmented: 'bg-primary text-primary-foreground',
}

const IDLE_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  chip: 'text-text-muted hover:bg-surface-muted/60 hover:text-text',
  segmented: 'text-text-muted hover:bg-surface-muted hover:text-text',
}
</script>

<template>
  <div :class="GROUP_CLASSES[variant]" role="group" :aria-label="groupLabel">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      :aria-pressed="item.value === modelValue"
      class="transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="[
        ITEM_CLASSES[variant],
        item.value === modelValue ? ACTIVE_CLASSES[variant] : IDLE_CLASSES[variant],
      ]"
      @click="emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
