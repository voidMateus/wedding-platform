<script setup lang="ts">
interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  type?:
    'text' | 'email' | 'tel' | 'password' | 'number' | 'date' | 'time' | 'datetime-local' | 'color'
  /** Só relevante para type="number" (ex.: "any" para permitir decimais). */
  step?: string | number
  error?: string
  disabled?: boolean
  /** Ícone lucide à esquerda dentro do campo — usado por campos de busca. */
  icon?: string
  /** 'muted' assenta o campo sobre a superfície de faixa/chip, para o campo não competir com o conteúdo (busca do header do admin). */
  tone?: 'default' | 'muted'
}

const {
  modelValue = '',
  label,
  placeholder,
  type = 'text',
  step,
  error,
  disabled = false,
  icon,
  tone = 'default',
} = defineProps<Props>()

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-surface',
  muted: 'bg-surface-muted/70',
}

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
    <div class="relative flex flex-col">
      <Icon
        v-if="icon"
        :name="icon"
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        :id="inputId"
        :type="type"
        :step="step"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        class="h-10 rounded-md border border-border px-3 text-sm text-text placeholder:text-text-muted transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        :class="[toneClasses[tone], icon && 'pl-9']"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="error" :id="`${inputId}-error`" class="text-sm text-danger" role="alert">
      {{ error }}
    </p>
  </div>
</template>
