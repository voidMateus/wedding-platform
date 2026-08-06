<script setup lang="ts">
interface SelectOption {
  value: string
  label: string
}

interface Props {
  modelValue?: string
  label?: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  disabled?: boolean
}

const {
  modelValue = '',
  label,
  options,
  placeholder,
  error,
  disabled = false,
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectId = useId()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="selectId" class="text-sm font-medium text-text">
      {{ label }}
    </label>
    <div class="relative">
      <select
        :id="selectId"
        :disabled="disabled"
        :value="modelValue"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${selectId}-error` : undefined"
        class="h-10 w-full appearance-none rounded-md border border-border bg-surface px-3 pr-9 text-sm text-text transition-brand hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <Icon
        name="lucide:chevron-down"
        class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      />
    </div>
    <p v-if="error" :id="`${selectId}-error`" class="text-sm text-red-600" role="alert">
      {{ error }}
    </p>
  </div>
</template>
