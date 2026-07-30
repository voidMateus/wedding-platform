<script setup lang="ts">
interface RadioOption {
  value: string
  label: string
  description?: string
}

interface Props {
  modelValue?: string
  label?: string
  options: RadioOption[]
  error?: string
  disabled?: boolean
}

const { modelValue = '', label, options, error, disabled = false } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const groupName = useId()
</script>

<template>
  <fieldset class="flex flex-col gap-2">
    <legend v-if="label" class="text-sm font-medium text-text">{{ label }}</legend>
    <label
      v-for="option in options"
      :key="option.value"
      class="flex items-start gap-2 rounded-md border border-border p-3 text-sm text-text"
      :class="disabled ? 'opacity-50' : 'cursor-pointer hover:bg-surface-muted'"
    >
      <input
        type="radio"
        :name="groupName"
        :value="option.value"
        :checked="modelValue === option.value"
        :disabled="disabled"
        class="mt-0.5 h-4 w-4 border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @change="emit('update:modelValue', option.value)"
      />
      <span class="flex flex-col">
        <span>{{ option.label }}</span>
        <span v-if="option.description" class="text-text-muted">{{ option.description }}</span>
      </span>
    </label>
    <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
  </fieldset>
</template>
