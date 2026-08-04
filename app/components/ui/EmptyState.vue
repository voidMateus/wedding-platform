<script setup lang="ts">
interface Props {
  title: string
  description?: string
  /** Ícone lucide opcional, renderizado acima do título — deixa o estado vazio mais convidativo. */
  icon?: string
}

defineProps<Props>()
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center"
  >
    <div
      v-if="icon"
      class="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-text-muted"
    >
      <Icon :name="icon" class="h-6 w-6" />
    </div>
    <p class="text-sm font-medium text-text">{{ title }}</p>
    <p v-if="description" class="text-sm text-text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-2">
      <slot />
    </div>
  </div>
</template>
