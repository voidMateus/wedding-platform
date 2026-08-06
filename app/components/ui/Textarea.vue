<script setup lang="ts">
interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  rows?: number
}

const {
  modelValue = '',
  label,
  placeholder,
  error,
  disabled = false,
  rows = 3,
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaId = useId()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="textareaId" class="text-sm font-medium text-text">
      {{ label }}
    </label>
    <textarea
      :id="textareaId"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${textareaId}-error` : undefined"
      class="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" :id="`${textareaId}-error`" class="text-sm text-red-600" role="alert">
      {{ error }}
    </p>
  </div>
</template>
