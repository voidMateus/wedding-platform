<script setup lang="ts">
interface Props {
  label: string
  /** Estado de seleção (ex.: etiqueta marcada) — chips puramente informativos nunca ficam selecionados. */
  selected?: boolean
  /** Quando true, o label vira um botão clicável (emite 'click') — chips de toggle (ex.: etiquetas de convite). */
  clickable?: boolean
  /** Mostra um botão de remover (emite 'remove') ao final do chip. */
  removable?: boolean
}

const { label, selected = false, clickable = false, removable = false } = defineProps<Props>()

const emit = defineEmits<{
  click: []
  remove: []
}>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border pl-3 pr-1 text-sm transition-brand"
    :class="
      selected
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-surface text-text-muted hover:border-primary/30'
    "
  >
    <button v-if="clickable" type="button" class="py-1" @click="emit('click')">{{ label }}</button>
    <span v-else class="py-1">{{ label }}</span>

    <slot name="actions" />

    <button
      v-if="removable"
      type="button"
      class="rounded-full p-0.5 opacity-70 transition-brand hover:opacity-100"
      :aria-label="`Remover ${label}`"
      @click="emit('remove')"
    >
      <Icon name="lucide:x" class="h-3 w-3" />
    </button>
  </span>
</template>
