<script setup lang="ts">
interface Props {
  icon: string
  label: string
  value: string | number
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const { tone = 'default' } = defineProps<Props>()

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-surface-muted text-text-muted',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
}
</script>

<template>
  <UiCard class="flex items-center gap-3">
    <span
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      :class="toneClasses[tone]"
    >
      <Icon :name="icon" class="h-5 w-5" />
    </span>
    <div class="min-w-0">
      <p class="truncate text-sm text-text-muted">{{ label }}</p>
      <p class="truncate text-2xl font-semibold text-text" :title="String(value)">{{ value }}</p>
    </div>
  </UiCard>
</template>
