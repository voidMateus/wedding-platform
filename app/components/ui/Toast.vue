<script setup lang="ts">
interface Props {
  tone?: 'success' | 'error' | 'info'
  message: string
}

const { tone = 'info', message } = defineProps<Props>()

const emit = defineEmits<{
  dismiss: []
}>()

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-border bg-surface text-text',
}
</script>

<template>
  <div
    role="status"
    class="flex items-start gap-3 rounded-lg border p-3 shadow-md"
    :class="toneClasses[tone]"
  >
    <p class="flex-1 text-sm">{{ message }}</p>
    <button
      type="button"
      class="text-lg leading-none text-current opacity-60 hover:opacity-100"
      aria-label="Fechar"
      @click="emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>
