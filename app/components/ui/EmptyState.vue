<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center"
  >
    <p class="text-sm font-medium text-text">{{ title }}</p>
    <p v-if="description" class="text-sm text-text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-2">
      <slot />
    </div>
  </div>
</template>
