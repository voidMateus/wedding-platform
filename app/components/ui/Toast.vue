<script setup lang="ts">
interface Props {
  tone?: 'success' | 'error' | 'info' | 'warning'
  message: string
}

const { tone = 'info', message } = defineProps<Props>()

const emit = defineEmits<{
  dismiss: []
}>()

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  success: 'border-success/20 bg-success/5 text-success',
  error: 'border-danger/20 bg-danger/5 text-danger',
  warning: 'border-warning/20 bg-warning/5 text-warning',
  info: 'border-border bg-surface text-text',
}

const toneIcons: Record<NonNullable<Props['tone']>, string> = {
  success: 'lucide:check-circle',
  error: 'lucide:alert-circle',
  warning: 'lucide:alert-triangle',
  info: 'lucide:info',
}
</script>

<template>
  <div
    role="status"
    class="flex items-start gap-3 rounded-lg border p-3 shadow-md"
    :class="toneClasses[tone]"
  >
    <Icon :name="toneIcons[tone]" class="mt-0.5 h-4 w-4 shrink-0" />
    <p class="flex-1 text-sm">{{ message }}</p>
    <button
      type="button"
      class="text-lg leading-none text-current opacity-60 transition-brand hover:opacity-100"
      aria-label="Fechar"
      @click="emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>
