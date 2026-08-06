<script setup lang="ts">
interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  type?:
    | 'text'
    | 'email'
    | 'tel'
    | 'password'
    | 'number'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'color'
  /** Só relevante para type="number" (ex.: "any" para permitir decimais). */
  step?: string | number
  error?: string
  disabled?: boolean
}

const {
  modelValue = '',
  label,
  placeholder,
  type = 'text',
  step,
  error,
  disabled = false,
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputId = useId()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-text">
      {{ label }}
    </label>
    <input
      :id="inputId"
      :type="type"
      :step="step"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      class="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" :id="`${inputId}-error`" class="text-sm text-red-600" role="alert">
      {{ error }}
    </p>
  </div>
</template>
