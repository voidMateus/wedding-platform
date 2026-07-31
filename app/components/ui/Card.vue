<script setup lang="ts">
interface Props {
  padding?: 'none' | 'sm' | 'md'
}

const { padding = 'md' } = defineProps<Props>()

const paddingClasses: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated shadow-sm" :class="paddingClasses[padding]">
    <div v-if="$slots.header" class="mb-3 flex items-center justify-between gap-2">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="mt-3 flex items-center justify-end gap-2">
      <slot name="footer" />
    </div>
  </div>
</template>
